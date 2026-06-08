import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from 'src/company/company.entity';
import { User, UserStatus } from 'src/entities/user/user.entity';
import { Wallet } from 'src/ledger/walled.entity';
import { Ledger, LedgerType, LedgerOrigin } from 'src/ledger/ledger.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,

    @InjectRepository(Ledger)
    private readonly ledgerRepo: Repository<Ledger>,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // ENDPOINT 1 — GET /dashboard/master
  // ─────────────────────────────────────────────────────────────────
  async getMasterDashboard() {
    // Contagens de empresas (soft-deleted já excluídos pelo @DeleteDateColumn)
    const totalEmpresas = await this.companyRepo.count();
    const empresasAtivas = await this.companyRepo.count({
      where: { status: CompanyStatus.ATIVA },
    });
    const empresasBloqueadas = await this.companyRepo.count({
      where: { status: CompanyStatus.BLOQUEADA },
    });

    // Contagem de usuários ativos (soft-deleted excluídos)
    const usuariosAtivos = await this.userRepo.count({
      where: { status: UserStatus.ATIVO },
    });

    // creditosVendidos: SUM de todos os registros CREDIT nas wallets do tipo COMPANY.
    // Critério: qualquer CREDIT inserido em wallet COMPANY, independente de origin
    // (AJUSTE = carga manual de créditos; TRANSFER = transferência; ESTORNO = devolução).
    // Representa o total de créditos que entraram nas empresas até hoje.
    const creditosVendidosRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .innerJoin('ledger.wallet', 'wallet')
      .select('COALESCE(SUM(ledger.amount), 0)', 'total')
      .where('wallet.type = :type', { type: 'COMPANY' })
      .andWhere('ledger.type = :ledgerType', { ledgerType: LedgerType.CREDIT })
      .getRawOne<{ total: string }>();

    const creditosVendidos = Number(creditosVendidosRaw?.total ?? 0);

    // creditosConsumidos: SUM de DEBIT com origin=CONSUMO em wallets COMPANY.
    // Retorna 0 até o Bloco 3 (módulo de consultas) existir — correto por design.
    const creditosConsumidosRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .innerJoin('ledger.wallet', 'wallet')
      .select('COALESCE(SUM(ledger.amount), 0)', 'total')
      .where('wallet.type = :type', { type: 'COMPANY' })
      .andWhere('ledger.type = :ledgerType', { ledgerType: LedgerType.DEBIT })
      .andWhere('ledger.origin = :origin', { origin: LedgerOrigin.CONSUMO })
      .getRawOne<{ total: string }>();

    const creditosConsumidos = Number(creditosConsumidosRaw?.total ?? 0);

    return {
      totalEmpresas,
      empresasAtivas,
      empresasBloqueadas,
      usuariosAtivos,
      creditosVendidos,
      creditosConsumidos,   // 0 até Bloco 3
      receitaMensal: null,  // sem modelo de invoice/pagamento ainda
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // ENDPOINT 2 — GET /dashboard/empresa/:companyId
  // ─────────────────────────────────────────────────────────────────
  async getEmpresaDashboard(
    companyId: number,
    currentUser: { userId: string; username: string; role: string; companyId?: number; permissions?: string[] },
  ) {
    // Tenant-check: non-master só pode ver a própria empresa
    if (currentUser.role !== 'master' && currentUser.companyId !== companyId) {
      throw new ForbiddenException('Acesso negado: você só pode visualizar dados da sua própria empresa');
    }

    // ── saldoCreditos: SUM CREDIT - SUM DEBIT da wallet COMPANY da empresa ──
    // Reutiliza o mesmo padrão de findCreditDetailsCompany (company.service.ts)
    const companyWallet = await this.walletRepo.findOne({
      where: { type: 'COMPANY', companyId },
    });

    let saldoCreditos = 0;
    if (companyWallet) {
      const creditRaw = await this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COALESCE(SUM(ledger.amount), 0)', 'total')
        .where('ledger.walletId = :walletId', { walletId: companyWallet.id })
        .andWhere('ledger.type = :type', { type: LedgerType.CREDIT })
        .getRawOne<{ total: string }>();

      const debitRaw = await this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COALESCE(SUM(ledger.amount), 0)', 'total')
        .where('ledger.walletId = :walletId', { walletId: companyWallet.id })
        .andWhere('ledger.type = :type', { type: LedgerType.DEBIT })
        .getRawOne<{ total: string }>();

      saldoCreditos = Number(creditRaw?.total ?? 0) - Number(debitRaw?.total ?? 0);
    }

    // ── IDs de wallets da empresa + seus usuários ──
    // consumoDiario e consumoMensal somam DEBIT origin=CONSUMO de todas as wallets
    // associadas à empresa (tanto wallet COMPANY quanto wallets USER dos funcionários).
    const allWallets = await this.walletRepo
      .createQueryBuilder('wallet')
      .innerJoin(User, 'user', 'user.company_id = :companyId AND wallet.userId = user.uid', { companyId })
      .select('wallet.id', 'id')
      .where('wallet.type = :type', { type: 'USER' })
      .getRawMany<{ id: string }>();

    const userWalletIds = allWallets.map((w) => w.id);
    if (companyWallet) {
      userWalletIds.push(companyWallet.id);
    }

    const now = new Date();

    // Início do dia corrente (meia-noite local do servidor)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Início do mês corrente
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const buildConsumoQuery = (from: Date) => {
      const qb = this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COALESCE(SUM(ledger.amount), 0)', 'total')
        .where('ledger.type = :ledgerType', { ledgerType: LedgerType.DEBIT })
        .andWhere('ledger.origin = :origin', { origin: LedgerOrigin.CONSUMO })
        .andWhere('ledger.createdAt >= :from', { from });

      if (userWalletIds.length > 0) {
        qb.andWhere('ledger.walletId IN (:...walletIds)', { walletIds: userWalletIds });
      } else {
        // Sem wallets → força 0 sem scan desnecessário
        qb.andWhere('1 = 0');
      }
      return qb;
    };

    const consumoDiarioRaw = await buildConsumoQuery(startOfDay).getRawOne<{ total: string }>();
    const consumoMensalRaw = await buildConsumoQuery(startOfMonth).getRawOne<{ total: string }>();

    const consumoDiario = Number(consumoDiarioRaw?.total ?? 0);  // 0 até Bloco 3
    const consumoMensal = Number(consumoMensalRaw?.total ?? 0);  // 0 até Bloco 3

    // ── Contagens de usuários da empresa ──
    const usuariosAtivos = await this.userRepo.count({
      where: { company: { id: companyId }, status: UserStatus.ATIVO },
    });

    const usuariosBloqueados = await this.userRepo
      .createQueryBuilder('user')
      .where('user.company_id = :companyId', { companyId })
      .andWhere('user.status IN (:...statuses)', {
        statuses: [UserStatus.BLOQUEADO, UserStatus.SUSPENSO],
      })
      .andWhere('user.deletedAt IS NULL')
      .getCount();

    // ── consultasRealizadas: count DEBIT origin=CONSUMO da empresa ──
    // Retorna 0 até o Bloco 3. Conta entradas de CONSUMO nas wallets COMPANY+USER da empresa.
    let consultasRealizadas = 0;
    if (userWalletIds.length > 0) {
      const consultasRaw = await this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('COUNT(ledger.id)', 'total')
        .where('ledger.type = :ledgerType', { ledgerType: LedgerType.DEBIT })
        .andWhere('ledger.origin = :origin', { origin: LedgerOrigin.CONSUMO })
        .andWhere('ledger.walletId IN (:...walletIds)', { walletIds: userWalletIds })
        .getRawOne<{ total: string }>();

      consultasRealizadas = Number(consultasRaw?.total ?? 0);
    }

    // ── rankingUsuarios: top 5 por SUM DEBIT (consumo) ──
    // JOIN wallet(type=USER, companyId)->ledger DEBIT, GROUP BY user, ORDER BY soma DESC
    const rankingRaw = await this.walletRepo
      .createQueryBuilder('wallet')
      .innerJoin(User, 'user', 'user.uid = wallet.userId AND user.deletedAt IS NULL')
      .innerJoin(
        Ledger,
        'ledger',
        'ledger.walletId = wallet.id AND ledger.type = :ledgerType',
        { ledgerType: LedgerType.DEBIT },
      )
      .select('user.uid', 'userId')
      .addSelect('user.username', 'username')
      .addSelect('COALESCE(SUM(ledger.amount), 0)', 'consumo')
      .where('wallet.type = :walletType', { walletType: 'USER' })
      .andWhere('wallet.companyId = :companyId', { companyId })
      .groupBy('user.uid')
      .addGroupBy('user.username')
      .orderBy('consumo', 'DESC')
      .limit(5)
      .getRawMany<{ userId: string; username: string; consumo: string }>();

    const rankingUsuarios = rankingRaw.map((r) => ({
      userId: r.userId,
      username: r.username,
      consumo: Number(r.consumo),
    }));

    return {
      saldoCreditos,
      consumoDiario,    // 0 até Bloco 3
      consumoMensal,    // 0 até Bloco 3
      usuariosAtivos,
      usuariosBloqueados,
      consultasRealizadas, // 0 até Bloco 3
      rankingUsuarios,     // [] enquanto sem DEBIT origin=CONSUMO
    };
  }
}
