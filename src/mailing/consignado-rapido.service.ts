import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as https from 'https';
import { NvCheckService } from './nvcheck.service';

type Filtro = { key: string; op: string; value: any };
type MailingEndpoint = 'mailing' | 'mailingContratos';

/**
 * Integração com a API Consignado Rápido (api.consignadorapido.com).
 * Mantém o token (validade 24h) em cache na memória do processo e renova
 * automaticamente. Requer IP da VPS liberado no suporte deles + credenciais
 * em env (CONSIGNADO_RAPIDO_USER / CONSIGNADO_RAPIDO_PASS).
 */
@Injectable()
export class ConsignadoRapidoService {
  private readonly logger = new Logger(ConsignadoRapidoService.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly nv: NvCheckService) {}

  private onlyDigits(v: unknown): string {
    return String(v ?? '').replace(/\D/g, '');
  }

  /**
   * Anexa telefones das DUAS fontes (Nova Vida + Consignado Rápido) ao(s)
   * benefício(s), com idempotência: deduplica pelo número (ddd+telefone) para
   * não repetir o mesmo telefone vindo das duas APIs.
   */
  private async enrichTelefones(data: any, cpf: string): Promise<void> {
    try {
      // Fonte 1 — Nova Vida (rico: operadora, tipo, whatsapp, melhor horário)
      const nvTels = await this.nv.telefonesByCpf(cpf);
      // Fonte 2 — Consignado Rápido (todos os telefones disponíveis)
      let consignadoNums: string[] = [];
      try {
        consignadoNums = await this.telefonesConsignado(cpf);
      } catch {
        /* ignore */
      }

      const apply = (b: any) => {
        if (!b || typeof b !== 'object') return;
        const merged: any[] = [];
        const seen = new Set<string>();
        const push = (tel: any) => {
          const key = this.onlyDigits(
            tel.numeroCompleto || `${tel.ddd ?? ''}${tel.numero ?? ''}`,
          );
          if (!key || seen.has(key)) return;
          seen.add(key);
          merged.push(tel);
        };

        // Nova Vida primeiro (mais completo)
        for (const t of nvTels) push({ ...t, origem: 'novavida' });

        // Consignado Rápido: o telefone do benefício + todos os coletados
        const candidatos = [
          this.onlyDigits(b.telefone),
          ...consignadoNums.map((n) => this.onlyDigits(n)),
        ].filter((n) => n && n.length >= 8);
        for (const num of candidatos) {
          const temDdd = num.length >= 10;
          push({
            ddd: temDdd ? num.slice(0, 2) : '',
            numero: temDdd ? num.slice(2) : num,
            numeroCompleto: num,
            tipo: null,
            operadora: null,
            whatsapp: false,
            melhorHorario: null,
            origem: 'consignado',
          });
        }

        b.telefones = merged;
        if (merged.length) b.telefone = merged[0].numeroCompleto;
      };

      if (Array.isArray(data)) {
        data.forEach((r) => apply(r?.beneficio ?? r));
      } else {
        apply(
          data?.beneficio && typeof data.beneficio === 'object'
            ? data.beneficio
            : data,
        );
      }
    } catch (e: any) {
      this.logger.warn(`Enriquecimento de telefones falhou: ${e?.message}`);
    }
  }

  private get baseUrl(): string {
    return (
      process.env.CONSIGNADO_RAPIDO_BASE_URL ||
      'https://api.consignadorapido.com'
    );
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.CONSIGNADO_RAPIDO_TOKEN ||
        (process.env.CONSIGNADO_RAPIDO_USER &&
          process.env.CONSIGNADO_RAPIDO_PASS),
    );
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Requisição forçando IPv4 (family: 4). O IPv4 do servidor está liberado no
   * Cloudflare da Consignado Rápido; o IPv6 (saída padrão) NÃO está e leva 403.
   * Usa https nativo (undici/Agent não disponível no runtime).
   */
  private rawFetch(
    url: string,
    init: any = {},
  ): Promise<{ status: number; text: string }> {
    return new Promise((resolve) => {
      const u = new URL(url);
      const req = https.request(
        {
          host: u.hostname,
          path: u.pathname + u.search,
          method: init.method || 'GET',
          family: 4, // força IPv4 (IP liberado no provedor)
          headers: init.headers || {},
          timeout: 30000,
        },
        (r) => {
          let d = '';
          r.on('data', (c) => (d += c));
          r.on('end', () => resolve({ status: r.statusCode || 0, text: d }));
        },
      );
      req.on('error', (e) => resolve({ status: 0, text: 'ERR ' + e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, text: 'timeout' });
      });
      if (init.body) req.write(init.body);
      req.end();
    });
  }

  /**
   * fetch com retry pro Cloudflare do Consignado Rápido — às vezes ele barra o
   * IP com uma página HTML (403) de forma intermitente. Retenta com folga e
   * devolve {status, text}.
   */
  private async cfFetch(
    url: string,
    init: RequestInit,
    tries = 5,
  ): Promise<{ status: number; text: string }> {
    let last = { status: 0, text: '' };
    for (let i = 0; i < tries; i++) {
      const { status, text } = await this.rawFetch(url, init);
      last = { status, text };
      const isCloudflare =
        status === 403 && text.slice(0, 120).includes('<!DOCTYPE');
      if (isCloudflare) {
        await this.sleep(1500);
        continue;
      }
      return last;
    }
    return last;
  }

  private async authenticate(): Promise<string> {
    const { status, text } = await this.cfFetch(`${this.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: process.env.CONSIGNADO_RAPIDO_USER,
        password: process.env.CONSIGNADO_RAPIDO_PASS,
      }),
    });

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      // resposta não-JSON (ex.: HTML do Cloudflare)
    }

    if (status !== 200 || data?.status !== 'success' || !data?.token) {
      const msg = data?.message || data?.msg || `HTTP ${status}`;
      this.logger.warn(`Auth Consignado Rápido falhou: ${msg}`);
      throw new BadGatewayException(
        `Falha na autenticação Consignado Rápido: ${msg}`,
      );
    }

    const token: string = data.token;
    this.token = token;
    // validade real 24h; renova com folga (23h)
    this.tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
    return token;
  }

  private async getToken(force = false): Promise<string> {
    // Token vitalício configurado → usa direto, sem autenticar (mais estável).
    const staticToken = process.env.CONSIGNADO_RAPIDO_TOKEN;
    if (staticToken && staticToken.trim()) {
      return staticToken.trim();
    }
    if (!this.isConfigured()) {
      throw new BadGatewayException(
        'Credenciais Consignado Rápido não configuradas (CONSIGNADO_RAPIDO_TOKEN ou USER/PASS)',
      );
    }
    if (force || !this.token || Date.now() >= this.tokenExpiresAt) {
      return this.authenticate();
    }
    return this.token;
  }

  /** Apenas autentica e retorna se o token foi obtido — usado para diagnóstico. */
  async ping(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.getToken(true);
      return { ok: true, message: 'Token obtido com sucesso' };
    } catch (e: any) {
      return { ok: false, message: e?.message ?? 'erro desconhecido' };
    }
  }

  async mailing(
    endpoint: MailingEndpoint,
    body: { limit: number; zip?: boolean; filtros: Filtro[] },
  ): Promise<any[]> {
    let token = await this.getToken();

    const doCall = (tk: string) =>
      this.rawFetch(`${this.baseUrl}/apimailing/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TOKEN: tk },
        body: JSON.stringify({
          limit: body.limit,
          zip: body.zip ?? false,
          filtros: body.filtros ?? [],
        }),
      });

    let { status, text } = await doCall(token);

    // token expirado/invalid → reautentica 1x
    if (status === 403) {
      token = await this.getToken(true);
      ({ status, text } = await doCall(token));
    }

    // 422 = nenhum dado para o filtro; 204 = sem conteúdo → lista vazia
    if (status === 422 || status === 204) {
      return [];
    }
    if (status === 412) {
      throw new BadGatewayException('Empresa inativa no Consignado Rápido (cod 412)');
    }
    // 500/502/503/504 = provedor de mailing fora do ar / instável → mensagem amigável
    if (status >= 500) {
      this.logger.warn(
        `Mailing Consignado Rápido indisponível (HTTP ${status}) endpoint=${endpoint}`,
      );
      throw new ServiceUnavailableException(
        'O serviço de geração de mailing está temporariamente indisponível. Tente novamente em alguns minutos.',
      );
    }
    if (status < 200 || status >= 300) {
      throw new BadGatewayException(
        `Erro Consignado Rápido (HTTP ${status}): ${text.slice(0, 200)}`,
      );
    }

    let data: any = [];
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
    if (Array.isArray(data)) return data;
    // resposta 200 pode vir como objeto único de lead
    if (data && (data.cpf || data.nome || data.nb)) return [data];
    return [];
  }

  /** GET autenticado com TOKEN header + retry Cloudflare + reauth em token inválido. */
  private async getWithToken(
    path: string,
  ): Promise<{ status: number; data: any }> {
    let token = await this.getToken();
    let { status, text } = await this.cfFetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: { TOKEN: token },
    });

    // token inválido/expirado → reautentica 1x e tenta de novo
    if (status === 403 && text.includes('invalid token')) {
      token = await this.getToken(true);
      ({ status, text } = await this.cfFetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: { TOKEN: token },
      }));
    }

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // não-JSON
    }
    return { status, data };
  }

  /**
   * Consulta Benefícios por CPF — GET /api/beneficios?cpf=
   * Retorno mais completo: dados pessoais + benefício + margem + TODOS os
   * contratos de empréstimo + cartões RMC/RCC + endereço + telefone.
   */
  async consultaBeneficios(cpf: string): Promise<any> {
    const { status, data } = await this.getWithToken(
      `/api/beneficios?cpf=${encodeURIComponent(cpf)}`,
    );
    // 403 = bloqueio Cloudflare/IP intermitente; >=500 = erro upstream.
    // Em ambos NÃO é "sem benefício" — é falha transiente, deve ser reportada
    // como erro (para o lote marcar 'erro' e permitir nova tentativa).
    if (status === 403 || status >= 500) {
      throw new BadGatewayException(
        `Consulta indisponível no momento (HTTP ${status}) — bloqueio temporário do provedor, tente novamente`,
      );
    }
    // telefones ricos via NvCheck (múltiplos números + operadora/whatsapp)
    await this.enrichTelefones(data, cpf);
    return data;
  }

  /** Consulta CPF INSS — GET /api/cpf?cpf= (Nome, beneficio, especie, Margem35...). */
  async consultaCpf(cpf: string): Promise<any> {
    const { status, data } = await this.getWithToken(
      `/api/cpf?cpf=${encodeURIComponent(cpf)}`,
    );
    if (status >= 500) {
      throw new BadGatewayException(`Consulta CPF falhou (HTTP ${status})`);
    }
    return data;
  }

  /** Consulta Offline — GET /api/offline?nb= (benefício completo + margem + bancos). */
  async consultaOffline(nb: string): Promise<any> {
    const { status, data } = await this.getWithToken(
      `/api/offline?nb=${encodeURIComponent(nb)}`,
    );
    if (status >= 500) {
      throw new BadGatewayException(`Consulta offline falhou (HTTP ${status})`);
    }
    // O /api/offline NÃO retorna telefone — enriquece via NvCheck (múltiplos
    // telefones). Fallback /api/cpf (campo Telefone) se o NvCheck não trouxer nada.
    const benef =
      data?.beneficio && typeof data.beneficio === 'object'
        ? data.beneficio
        : data;
    const cpf = benef?.cpf;
    if (cpf) {
      await this.enrichTelefones(data, String(cpf));
      if (benef && !benef.telefone) {
        try {
          const tel = await this.telefoneByCpf(String(cpf));
          if (tel) benef.telefone = tel;
        } catch {
          /* ignore */
        }
      }
    }
    return data;
  }

  /** Telefone pelo CPF via /api/cpf (campo Telefone). null se indisponível. */
  private async telefoneByCpf(cpf: string): Promise<string | null> {
    const onlyDigits = cpf.replace(/\D/g, '');
    const { status, data } = await this.getWithToken(
      `/api/cpf?cpf=${encodeURIComponent(onlyDigits)}`,
    );
    if (status < 200 || status >= 300) return null;
    const arr = Array.isArray(data?.req) ? data.req : [];
    for (const r of arr) {
      const t = r?.Telefone ?? r?.telefone;
      if (t && String(t).trim()) return String(t).trim();
    }
    return null;
  }

  /**
   * TODOS os telefones do Consignado Rápido para um CPF.
   * - /api/telefone?cpf= (lista completa — requer permissão "Telefone" na conta;
   *   sem ela retorna 412 e caímos só no /api/cpf).
   * - /api/cpf (campo Telefone de cada benefício).
   * Retorna números só com dígitos, deduplicados.
   */
  private async telefonesConsignado(cpf: string): Promise<string[]> {
    const digits = cpf.replace(/\D/g, '');
    const out: string[] = [];
    const seen = new Set<string>();
    const add = (v: unknown) => {
      const n = this.onlyDigits(v);
      if (n.length >= 8 && !seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    };

    // 1) Lista completa — POST /api/consultatelefone (requer permissão "Telefone").
    //    Resposta: array de strings de números (ex.: ["8834232657","85985909317",...]).
    try {
      let token = await this.getToken();
      const body = JSON.stringify({ cpf: digits });
      const headers = { 'Content-Type': 'application/json', TOKEN: token };
      let { status, text } = await this.cfFetch(
        `${this.baseUrl}/api/consultatelefone`,
        { method: 'POST', headers, body },
      );
      if (status === 403 && text.includes('invalid token')) {
        token = await this.getToken(true);
        ({ status, text } = await this.cfFetch(
          `${this.baseUrl}/api/consultatelefone`,
          { method: 'POST', headers: { ...headers, TOKEN: token }, body },
        ));
      }
      if (status >= 200 && status < 300) {
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          /* não-JSON */
        }
        const buckets = [
          Array.isArray(data) ? data : null,
          data?.req,
          data?.telefones,
          data?.Telefones,
          data?.data,
        ].filter(Array.isArray) as any[][];
        for (const arr of buckets) {
          for (const r of arr) {
            if (r == null) continue;
            if (typeof r === 'string' || typeof r === 'number') {
              add(r);
              continue;
            }
            const ddd = r.DDD ?? r.ddd ?? '';
            const num =
              r.Telefone ?? r.telefone ?? r.TELEFONE ?? r.numero ?? r.Numero ?? '';
            add(`${ddd}${num}` || num);
          }
        }
      }
    } catch {
      /* sem permissão / indisponível */
    }

    // 2) Telefone do /api/cpf (todos os benefícios)
    try {
      const { status, data } = await this.getWithToken(
        `/api/cpf?cpf=${encodeURIComponent(digits)}`,
      );
      if (status >= 200 && status < 300) {
        const arr = Array.isArray(data?.req) ? data.req : [];
        for (const r of arr) add(r?.Telefone ?? r?.telefone);
      }
    } catch {
      /* ignore */
    }

    return out;
  }
}
