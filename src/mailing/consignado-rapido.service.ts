import { BadGatewayException, Injectable, Logger } from '@nestjs/common';

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
      const res = await fetch(url, init);
      const text = await res.text();
      last = { status: res.status, text };
      const isCloudflare =
        res.status === 403 && text.slice(0, 120).includes('<!DOCTYPE');
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
      fetch(`${this.baseUrl}/apimailing/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TOKEN: tk },
        body: JSON.stringify({
          limit: body.limit,
          zip: body.zip ?? false,
          filtros: body.filtros ?? [],
        }),
      });

    let res = await doCall(token);

    // token expirado/invalid → reautentica 1x
    if (res.status === 403) {
      token = await this.getToken(true);
      res = await doCall(token);
    }

    // 422 = nenhum dado para o filtro; 204 = sem conteúdo → lista vazia
    if (res.status === 422 || res.status === 204) {
      return [];
    }
    if (res.status === 412) {
      throw new BadGatewayException('Empresa inativa no Consignado Rápido (cod 412)');
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new BadGatewayException(
        `Erro Consignado Rápido (HTTP ${res.status}): ${txt.slice(0, 200)}`,
      );
    }

    const data: any = await res.json().catch(() => []);
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
    if (status >= 500) {
      throw new BadGatewayException(
        `Consulta de benefícios falhou (HTTP ${status})`,
      );
    }
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
    return data;
  }
}
