import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType, LedgerOrigin } from 'src/ledger/ledger.entity';
import { ConsignadoRapidoService } from './consignado-rapido.service';
import { ExtracaoOnlineService } from './extracao-online.service';
import { GerarMailingDto } from './dto/gerar-mailing.dto';
import { MailingGeneration } from './mailing-generation.entity';

type CurrentUser = {
  userId?: string;
  username?: string;
  role?: string;
  companyId?: number;
};

@Injectable()
export class MailingService {
  private readonly logger = new Logger(MailingService.name);

  constructor(
    private readonly cr: ConsignadoRapidoService,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    @InjectRepository(MailingGeneration)
    private readonly genRepo: Repository<MailingGeneration>,
    private readonly dataSource: DataSource,
    private readonly extracaoOnline: ExtracaoOnlineService,
  ) {}

  private creditCost(): number {
    const n = Number(process.env.MAILING_CREDIT_COST ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }

  private extracaoOnlineCreditCost(): number {
    const n = Number(process.env.EXTRACAO_ONLINE_CREDIT_COST ?? 1);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }

  private async companyBalance(companyId: number): Promise<{ walletId: string; balance: number } | null> {
    const wallet = await this.walletRepo.findOne({
      where: { type: 'COMPANY', companyId },
    });
    if (!wallet) return null;

    const raw = await this.dataSource
      .getRepository(Ledger)
      .createQueryBuilder('l')
      .select(
        'COALESCE(SUM(CASE WHEN l.type = :c THEN l.amount WHEN l.type = :d THEN -l.amount ELSE 0 END), 0)',
        'bal',
      )
      .where('l.walletId = :wid', { wid: wallet.id })
      .setParameters({ c: LedgerType.CREDIT, d: LedgerType.DEBIT })
      .getRawOne<{ bal: string }>();

    return { walletId: wallet.id, balance: Number(raw?.bal ?? 0) };
  }

  async gerar(dto: GerarMailingDto, currentUser: CurrentUser) {
    const comContrato = !!dto.comContrato;
    const maxLimit = comContrato ? 25000 : 1000;

    let limit = Number(dto.limit) || 0;
    if (limit <= 0) {
      throw new BadRequestException('Quantidade de leads (limit) é obrigatória');
    }
    if (limit > maxLimit) limit = maxLimit;

    const filtros = Array.isArray(dto.filtros) ? dto.filtros : [];

    // A base do Consignado Rápido exige ao menos 1 filtro: sem nenhum critério o
    // endpoint de mailing retorna erro SQL (HTTP 500). Bloqueamos aqui com mensagem
    // clara em vez de deixar a chamada falhar e virar 503.
    if (filtros.length === 0) {
      throw new BadRequestException(
        'Selecione ao menos um filtro para gerar o mailing (ex.: UF, espécie, idade, salário).',
      );
    }

    const cost = this.creditCost();

    // Consumo: 1 crédito por geração (configurável). Master não tem carteira → não debita.
    const cobravel = !!currentUser.companyId;
    if (cobravel) {
      const info = await this.companyBalance(currentUser.companyId!);
      if (!info) {
        throw new BadRequestException('Empresa sem carteira de créditos');
      }
      if (info.balance < cost) {
        throw new BadRequestException('Saldo de créditos insuficiente para gerar o mailing');
      }
    }

    // Chama o Consignado Rápido ANTES de debitar — se falhar (IP/auth/erro), não cobra.
    const leads = await this.cr.mailing(
      comContrato ? 'mailingContratos' : 'mailing',
      { limit, zip: false, filtros },
    );

    if (cobravel) {
      await this.commitDebit(currentUser, cost, dto.nome);
    }

    // Persiste a geração para a tela "Mailings Gerados". A higienização (CSV
    // rico de 46 colunas) roda em BACKGROUND para não estourar o timeout do proxy.
    let geracaoId: number | null = null;
    try {
      const saved = await this.genRepo.save(
        this.genRepo.create({
          companyId: currentUser.companyId ?? null,
          userId: currentUser.userId,
          username: currentUser.username,
          nome: dto.nome,
          comContrato,
          source: 'mailing',
          total: leads.length,
          status: 'processando',
          filtros: JSON.stringify(filtros),
          leads: JSON.stringify(leads),
        }),
      );
      geracaoId = saved.id;
      // dispara higienização sem aguardar (background)
      void this.higienizar(saved.id, leads, dto.posFiltros);
    } catch (e: any) {
      this.logger.warn(`Falha ao salvar histórico de mailing: ${e?.message}`);
    }

    return {
      success: true,
      geracaoId,
      total: leads.length,
      comContrato,
      creditCost: cobravel ? cost : 0,
      status: 'processando',
      leads,
    };
  }

  /**
   * Consulta Gerar Lote: enriquece a lista de identificadores (CPF/NB) que o
   * próprio usuário forneceu e devolve a mesma planilha de 46 colunas da
   * higienização, SEM usar filtros de mailing. Roda em background como o `gerar`.
   */
  async gerarLote(
    identificadores: string[],
    nome: string | undefined,
    currentUser: CurrentUser,
  ) {
    // Normaliza, classifica (11 díg = CPF, 10 = NB) e deduplica.
    const seen = new Set<string>();
    const leads: { cpf?: string; nb?: string }[] = [];
    let ignorados = 0;
    for (const raw of identificadores ?? []) {
      const d = String(raw ?? '').replace(/\D/g, '');
      if (d.length === 11) {
        if (seen.has('c' + d)) continue;
        seen.add('c' + d);
        leads.push({ cpf: d });
      } else if (d.length === 10) {
        if (seen.has('n' + d)) continue;
        seen.add('n' + d);
        leads.push({ nb: d });
      } else {
        ignorados++;
      }
      if (leads.length >= 5000) break;
    }

    if (leads.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um CPF (11 dígitos) ou NB (10 dígitos) válido.',
      );
    }

    // Mesmo modelo de cobrança do mailing: 1 crédito por geração (empresa).
    const cost = this.creditCost();
    const cobravel = !!currentUser.companyId;
    if (cobravel) {
      const info = await this.companyBalance(currentUser.companyId!);
      if (!info) throw new BadRequestException('Empresa sem carteira de créditos');
      if (info.balance < cost) {
        throw new BadRequestException('Saldo de créditos insuficiente para gerar o lote');
      }
      await this.commitDebit(
        currentUser,
        cost,
        nome ? `Lote: ${nome}` : 'Consulta em lote',
      );
    }

    let geracaoId: number | null = null;
    try {
      const saved = await this.genRepo.save(
        this.genRepo.create({
          companyId: currentUser.companyId ?? null,
          userId: currentUser.userId,
          username: currentUser.username,
          nome,
          comContrato: false,
          source: 'lote',
          total: leads.length,
          status: 'processando',
          leads: JSON.stringify(leads),
        }),
      );
      geracaoId = saved.id;
      void this.higienizarLote(saved.id, leads);
    } catch (e: any) {
      this.logger.warn(`Falha ao salvar lote: ${e?.message}`);
    }

    return {
      success: true,
      geracaoId,
      total: leads.length,
      ignorados,
      status: 'processando',
    };
  }

  /**
   * Resolve NB→CPF (via /api/offline) para os leads que vieram só com NB e
   * delega ao `higienizar` (enriquece por CPF e monta o CSV de 46 colunas).
   */
  private async higienizarLote(
    geracaoId: number,
    leads: { cpf?: string; nb?: string }[],
  ): Promise<void> {
    try {
      const resolved: { cpf?: string; nb?: string }[] = [];
      const CONC = 6;
      for (let i = 0; i < leads.length; i += CONC) {
        const slice = leads.slice(i, i + CONC);
        const part = await Promise.all(
          slice.map(async (lead) => {
            if (lead.cpf) return lead;
            const nb = String(lead.nb ?? '').replace(/\D/g, '');
            if (!nb) return lead;
            try {
              const off = await this.cr.consultaOffline(nb);
              const benef =
                off?.beneficio && typeof off.beneficio === 'object'
                  ? off.beneficio
                  : off;
              const cpf = String(benef?.cpf ?? '').replace(/\D/g, '');
              return cpf ? { cpf, nb } : { nb };
            } catch {
              return { nb };
            }
          }),
        );
        resolved.push(...part);
      }
      // reusa o enriquecimento por CPF + CSV + atualização de status (sem pós-filtros)
      await this.higienizar(geracaoId, resolved, undefined);
    } catch (e: any) {
      this.logger.warn(`Lote falhou (geração ${geracaoId}): ${e?.message}`);
      await this.genRepo
        .update(geracaoId, {
          status: 'erro',
          erro: String(e?.message ?? 'erro').slice(0, 250),
        })
        .catch(() => undefined);
    }
  }

  // ─────────── Higienização (CSV rico formato Consignado) ───────────

  private readonly CSV_HEADERS = [
    'CPF', 'BENEFICIO', 'DATA_NASCIMENTO', 'ID_ESPECIE', 'ID_SITUACAO_NB',
    'CPF_REPRESENTANTE_LEGAL', 'NOME_REPRESENTANTE_LEGAL', 'BLOQUEIO_EMPRESTIMO',
    'NAO_PERTUBE', 'NOME', 'VLR_BENEFICIO', 'MARGEM_35', 'MARGEM_30', 'DDB', 'DIB',
    'SITUACAO', 'MEIO_PAGAMENTO', 'BANCO_PAGAMENTO', 'AGENCIA_PAGAMENTO',
    'CONTA_PAGAMENTO', 'UF', 'MUNICIPIO', 'BAIRRO', 'ENDERECO', 'CEP', 'IRRF',
    'BASE_CALCULO', 'POSSUI_CARTAO_RMC', 'MARGEM_CARTAO_RMC', 'POSSUI_CARTAO_RCC',
    'MARGEM_CARTAO_RCC', 'QTD_CONTRATOS', 'SOMA_PARCELAS_EMPRESTIMOS', 'BANCO_OP',
    'TIPO_EMPRESTIMO', 'CONTRATO', 'PRAZO', 'TAXA_APROXIMADA', 'VL_PARCELA',
    'VL_EMPRESTIMO', 'INICIO_DESCONTO', 'FINAL_DESCONTO', 'PARCELAS_PAGAS',
    'TELEFONE1', 'TELEFONE2', 'TELEFONE3',
  ];

  private dBR(v: any): string {
    if (!v) return '';
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
  }
  private num(v: any): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  private brMoney(v: any): string {
    const n = this.num(v);
    if (n === null) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  private dotNum(v: any): string {
    const n = this.num(v);
    return n === null ? '' : n.toFixed(2);
  }
  private csvField(v: any): string {
    const s = v === null || v === undefined ? '' : String(v);
    // separador é ; — remove ; e quebras de linha do conteúdo
    return s.replace(/[;\r\n]+/g, ' ').trim();
  }

  /** Monta uma linha (objeto benefício enriquecido + lead básico + telefones). */
  private linhaCsv(b: any, lead: any): string {
    const m = b?.margem ?? {};
    const dbk = b?.dadosBancarios ?? {};
    const end = b?.enderecoPessoal ?? {};
    const contratos: any[] = Array.isArray(b?.contratosEmprestimo)
      ? b.contratosEmprestimo
      : [];
    const c0 = contratos[0] ?? {};
    const tels: any[] = Array.isArray(b?.telefones) ? b.telefones : [];
    const tel = (i: number) =>
      tels[i]?.numeroCompleto || (i === 0 && b?.telefone ? String(b.telefone).replace(/\D/g, '') : '');
    const base = this.num(m.baseCalculoMargemConsignavel);
    const margem35 = base !== null ? this.brMoney(base * 0.4) : '';
    const somaParc = contratos.reduce((s, c) => s + (this.num(c.valorParcela) ?? 0), 0);

    const cols = [
      b?.cpf ?? lead?.cpf,                                   // CPF
      b?.beneficio ?? lead?.nb,                              // BENEFICIO
      this.dBR(b?.dataNascimento ?? lead?.nasc),            // DATA_NASCIMENTO
      b?.especie?.codigo,                                   // ID_ESPECIE
      b?.situacaoBeneficio === 'ATIVO' ? 1 : '',           // ID_SITUACAO_NB
      '',                                                   // CPF_REPRESENTANTE_LEGAL
      '',                                                   // NOME_REPRESENTANTE_LEGAL
      b?.bloqueioEmprestismo ? 1 : '',                     // BLOQUEIO_EMPRESTIMO
      b?.NaoPerturbe ?? '0',                               // NAO_PERTUBE
      b?.nome ?? lead?.nome,                                // NOME
      this.brMoney(b?.valorBeneficio),                     // VLR_BENEFICIO
      margem35,                                             // MARGEM_35
      '',                                                   // MARGEM_30
      this.dBR(b?.ddb),                                     // DDB
      this.dBR(b?.dib),                                     // DIB
      b?.situacaoBeneficio,                                // SITUACAO
      dbk?.banco?.tipo,                                     // MEIO_PAGAMENTO
      dbk?.banco?.codigo,                                   // BANCO_PAGAMENTO
      dbk?.agencia?.codigo,                                 // AGENCIA_PAGAMENTO
      String(dbk?.banco?.numero ?? dbk?.meioPagamento?.numero ?? '').trim(), // CONTA_PAGAMENTO
      end?.uf ?? lead?.uf,                                  // UF
      end?.cidade ?? lead?.municipio,                       // MUNICIPIO
      end?.bairro,                                          // BAIRRO
      end?.endereco,                                        // ENDERECO
      end?.cep,                                             // CEP
      this.dotNum(b?.valor_irrf),                           // IRRF
      this.dotNum(m.baseCalculoMargemConsignavel),         // BASE_CALCULO
      m.possuiCartao ? 1 : 0,                               // POSSUI_CARTAO_RMC
      this.dotNum(m.margemDisponivelCartao),               // MARGEM_CARTAO_RMC
      m.possuiCartaoBeneficio ?? 0,                        // POSSUI_CARTAO_RCC
      this.dotNum(m.margemDisponivelRcc),                  // MARGEM_CARTAO_RCC
      contratos.length || 0,                               // QTD_CONTRATOS
      somaParc ? somaParc.toFixed(2) : '0.00',             // SOMA_PARCELAS_EMPRESTIMOS
      c0?.banco?.nome ?? c0?.banco?.codigo ?? '',          // BANCO_OP
      c0?.tipoEmprestimo?.descricao ?? '',                 // TIPO_EMPRESTIMO
      c0?.contrato ?? '',                                  // CONTRATO
      c0?.quantidadeParcelas ?? '',                        // PRAZO
      c0?.taxa ?? '',                                      // TAXA_APROXIMADA
      this.dotNum(c0?.valorParcela),                       // VL_PARCELA
      this.dotNum(c0?.valorEmprestado ?? c0?.saldoQuitacao), // VL_EMPRESTIMO
      this.dBR(c0?.dataInicioContrato),                    // INICIO_DESCONTO
      this.dBR(c0?.dataFimContrato),                       // FINAL_DESCONTO
      c0?.quantidadeParcelas != null && c0?.quantidadeParcelasEmAberto != null
        ? c0.quantidadeParcelas - c0.quantidadeParcelasEmAberto
        : '',                                              // PARCELAS_PAGAS
      tel(0), tel(1), tel(2),                              // TELEFONE1/2/3
    ];
    return cols.map((x) => this.csvField(x)).join(';');
  }

  /** Filtros aplicados após a higienização (a API de mailing não os suporta). */
  private passaPosFiltro(
    b: any,
    lead: any,
    pf: any,
    mesAtual: number,
  ): boolean {
    if (!pf) return true;
    // Bloqueado para empréstimo
    const bloq = !!b?.bloqueioEmprestismo;
    if (pf.bloqueio === 'sim' && !bloq) return false;
    if (pf.bloqueio === 'nao' && bloq) return false;
    // Lead com telefone
    const temTel =
      (Array.isArray(b?.telefones) && b.telefones.length > 0) || !!b?.telefone;
    if (pf.comTelefone === 'sim' && !temTel) return false;
    if (pf.comTelefone === 'nao' && temTel) return false;
    // Excluir Não Me Perturbe (sim = remove os marcados)
    const np = ['1', 'true', 's'].includes(
      String(b?.NaoPerturbe ?? '0').toLowerCase(),
    );
    if (pf.naoPerturbe === 'sim' && np) return false;
    // Aniversariante do mês
    if (pf.aniversariante === 'sim' || pf.aniversariante === 'nao') {
      const d = String(b?.dataNascimento ?? lead?.nasc ?? '');
      const m = d.match(/^\d{4}-(\d{2})-/);
      const ehAniver = !!m && Number(m[1]) === mesAtual;
      if (pf.aniversariante === 'sim' && !ehAniver) return false;
      if (pf.aniversariante === 'nao' && ehAniver) return false;
    }
    return true;
  }

  /** Enriquecimento em background: monta o CSV de 46 colunas e salva. */
  private async higienizar(
    geracaoId: number,
    leads: any[],
    posFiltros?: any,
  ): Promise<void> {
    try {
      // CPFs únicos → consulta /api/beneficios (já agrega telefones das 2 fontes)
      const cpfs = Array.from(
        new Set(leads.map((l) => String(l?.cpf ?? '').replace(/\D/g, '')).filter(Boolean)),
      );
      const cache = new Map<string, any[]>();
      const CONC = 6;
      for (let i = 0; i < cpfs.length; i += CONC) {
        const slice = cpfs.slice(i, i + CONC);
        await Promise.all(
          slice.map(async (cpf) => {
            try {
              const resp = await this.cr.consultaBeneficios(cpf);
              const arr = Array.isArray(resp)
                ? resp.map((r: any) => r?.beneficio ?? r).filter(Boolean)
                : resp?.beneficio
                  ? [resp.beneficio]
                  : [];
              cache.set(cpf, arr);
            } catch {
              cache.set(cpf, []);
            }
          }),
        );
      }

      const pf = posFiltros ?? {};
      const mesAtual = new Date().getMonth() + 1;
      const linhas: string[] = [];
      for (const lead of leads) {
        const cpf = String(lead?.cpf ?? '').replace(/\D/g, '');
        const nb = String(lead?.nb ?? '').replace(/\D/g, '');
        const benefs = cache.get(cpf) ?? [];
        const b =
          benefs.find((x) => String(x?.beneficio ?? '').replace(/\D/g, '') === nb) ??
          benefs[0] ??
          null;
        if (!this.passaPosFiltro(b, lead, pf, mesAtual)) continue;
        linhas.push(this.linhaCsv(b ?? {}, lead));
      }

      const csv = [this.CSV_HEADERS.join(';'), ...linhas].join('\r\n');
      await this.genRepo.update(geracaoId, {
        csv,
        status: 'concluido',
        erro: null,
        total: linhas.length,
      });
    } catch (e: any) {
      this.logger.warn(`Higienização falhou (geração ${geracaoId}): ${e?.message}`);
      await this.genRepo
        .update(geracaoId, { status: 'erro', erro: String(e?.message ?? 'erro').slice(0, 250) })
        .catch(() => undefined);
    }
  }

  /** Retorna o CSV higienizado de uma geração (com checagem de escopo). */
  async obterCsv(
    currentUser: CurrentUser,
    id: number,
  ): Promise<{ status: string; nome?: string; csv: string | null }> {
    const g = await this.genRepo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Geração de mailing não encontrada');
    if (
      currentUser.role !== 'master' &&
      g.companyId !== (currentUser.companyId ?? -1)
    ) {
      throw new ForbiddenException('Sem acesso a esta geração de mailing');
    }
    return { status: g.status ?? 'concluido', nome: g.nome, csv: g.csv ?? null };
  }

  /** Lista os mailings gerados (sem o payload pesado de leads). */
  async listarGeracoes(
    currentUser: CurrentUser,
    page = 1,
    limit = 20,
    source?: string,
  ): Promise<{
    data: Partial<MailingGeneration>[];
    total: number;
    totalLeads: number;
    page: number;
    totalPages: number;
  }> {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;
    const escopo = currentUser.role !== 'master';
    const cid = currentUser.companyId ?? -1;

    const qb = this.genRepo
      .createQueryBuilder('g')
      .select([
        'g.id',
        'g.companyId',
        'g.userId',
        'g.username',
        'g.nome',
        'g.comContrato',
        'g.total',
        'g.status',
        'g.filtros',
        'g.createdAt',
      ])
      .orderBy('g.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    // Filtro de origem: 'lote' (Consulta Gerar Lote) vs 'mailing' (gerações por
    // filtro — inclui registros legados com source NULL).
    const applySource = (q: typeof qb) => {
      if (escopo) q.andWhere('g.companyId = :cid', { cid });
      if (source === 'lote') {
        q.andWhere('g.source = :src', { src: 'lote' });
      } else if (source === 'mailing') {
        q.andWhere('(g.source = :src OR g.source IS NULL)', { src: 'mailing' });
      }
    };

    applySource(qb);

    const [rows, total] = await qb.getManyAndCount();

    // Soma total de leads de TODAS as gerações no escopo (não só da página).
    const sumQb = this.genRepo
      .createQueryBuilder('g')
      .select('COALESCE(SUM(g.total), 0)', 'sum');
    applySource(sumQb as any);
    const sumRaw = await sumQb.getRawOne<{ sum: string }>();
    const totalLeads = Number(sumRaw?.sum ?? 0);

    const data = rows.map((r) => ({
      ...r,
      filtros: this.safeParse(r.filtros),
    })) as any;

    return {
      data,
      total,
      totalLeads,
      page: Math.max(Number(page) || 1, 1),
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /** Retorna uma geração com os leads (para re-download). */
  async obterGeracao(currentUser: CurrentUser, id: number) {
    const g = await this.genRepo.findOne({ where: { id } });
    if (!g) throw new NotFoundException('Geração de mailing não encontrada');
    if (
      currentUser.role !== 'master' &&
      g.companyId !== (currentUser.companyId ?? -1)
    ) {
      throw new ForbiddenException('Sem acesso a esta geração de mailing');
    }
    return {
      id: g.id,
      nome: g.nome,
      comContrato: g.comContrato,
      total: g.total,
      createdAt: g.createdAt,
      filtros: this.safeParse(g.filtros),
      leads: this.safeParse(g.leads) ?? [],
    };
  }

  private safeParse(v?: string): any {
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }

  /**
   * Consulta vários CPFs no Consignado Rápido. Para cada CPF chama /api/cpf;
   * se `full` e houver benefício, busca também o /api/offline (dado completo + margem).
   */
  async consultarLote(cpfs: string[], full = false) {
    const out: any[] = [];
    for (const raw of cpfs ?? []) {
      const cpf = String(raw).replace(/\D/g, '').padStart(11, '0');
      try {
        const resumo = await this.cr.consultaCpf(cpf);
        const nb = resumo?.req?.[0]?.beneficio ?? resumo?.beneficio ?? null;
        if (full && nb) {
          const offline = await this.cr.consultaOffline(
            String(nb).replace(/\D/g, ''),
          );
          out.push({ cpf, beneficio: nb, resumo, offline });
        } else {
          out.push({ cpf, beneficio: nb, resumo });
        }
      } catch (e: any) {
        out.push({ cpf, erro: e?.message ?? 'erro' });
      }
    }
    return { total: out.length, resultados: out };
  }

  async consultarExtracaoOnline(nb: string, currentUser: CurrentUser) {
    const cost = this.extracaoOnlineCreditCost();
    const cobravel = !!currentUser.companyId;

    if (cobravel) {
      const info = await this.companyBalance(currentUser.companyId!);
      if (!info) {
        throw new BadRequestException('Empresa sem carteira de créditos');
      }
      if (info.balance < cost) {
        throw new BadRequestException(
          'Saldo de créditos insuficiente para a extração online',
        );
      }
    }

    // Chama a API online ANTES de debitar — se falhar, não cobra.
    const data = await this.extracaoOnline.consultarNb(nb);

    if (cobravel) {
      await this.commitDebit(currentUser, cost, 'Extração de Consignação Online');
    }

    return { success: true, creditCost: cobravel ? cost : 0, data };
  }

  /**
   * Consulta em lote usando o endpoint rico /api/beneficios para cada CPF.
   * Dedup + limite de segurança. Devolve por CPF o benefício completo, ou
   * marca semBeneficio/erro sem derrubar o lote inteiro.
   */
  async consultarLoteBeneficios(cpfs: string[]) {
    const seen = new Set<string>();
    const lista: string[] = [];
    for (const raw of cpfs ?? []) {
      const cpf = String(raw).replace(/\D/g, '');
      if (cpf.length !== 11) continue;
      if (seen.has(cpf)) continue;
      seen.add(cpf);
      lista.push(cpf);
      if (lista.length >= 300) break;
    }

    const resultados: any[] = [];
    for (const cpf of lista) {
      try {
        const data = await this.cr.consultaBeneficios(cpf);
        const b = Array.isArray(data) ? data[0]?.beneficio : null;
        if (b) {
          resultados.push({ cpf, beneficio: b });
        } else {
          resultados.push({
            cpf,
            semBeneficio: true,
            msg: (data && (data.msg || data.message)) || null,
          });
        }
      } catch (e: any) {
        resultados.push({ cpf, erro: e?.message ?? 'erro' });
      }
    }

    return { total: resultados.length, resultados };
  }

  private async commitDebit(currentUser: CurrentUser, cost: number, nome?: string) {
    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const ledgerRepo = manager.getRepository(Ledger);

      const wallet = await walletRepo.findOne({
        where: { type: 'COMPANY', companyId: currentUser.companyId },
      });
      if (!wallet) {
        throw new BadRequestException('Empresa sem carteira de créditos');
      }

      const ledger = ledgerRepo.create({
        wallet,
        amount: cost,
        type: LedgerType.DEBIT,
        origin: LedgerOrigin.CONSUMO,
        description: `Geração de mailing${nome ? ': ' + nome : ''}`,
        performedById: currentUser.userId,
        performedByName: currentUser.username,
      });
      await ledgerRepo.save(ledger);
    });
  }
}
