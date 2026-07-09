import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

export interface NvTelefone {
  ddd: string;
  numero: string;
  numeroCompleto: string;
  tipo: string | null;
  operadora: string | null;
  whatsapp: boolean;
  melhorHorario: string | null;
}

/**
 * Integração NvCheck (Nova Vida TI) — wslocalizador.asmx.
 * Gera token (validade 24h) e consulta TELEFONES por CPF/documento.
 * Credenciais em env: NVCHECK_USER / NVCHECK_PASS / NVCHECK_CLIENTE.
 */
@Injectable()
export class NvCheckService {
  private readonly logger = new Logger(NvCheckService.name);
  private token: string | null = null;
  private tokenDay = ''; // token vale o dia em que foi gerado (24h)

  private get base(): string {
    return (
      process.env.NVCHECK_BASE_URL ||
      'https://wsnv.novavidati.com.br/wslocalizador.asmx'
    );
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.NVCHECK_USER &&
        process.env.NVCHECK_PASS &&
        process.env.NVCHECK_CLIENTE,
    );
  }

  private post(
    path: string,
    body: any,
    token?: string,
  ): Promise<{ status: number; text: string }> {
    return new Promise((resolve) => {
      const payload = JSON.stringify(body);
      const u = new URL(`${this.base}${path}`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload).toString(),
        // O wslocalizador.asmx retorna 500 ("source null") sem User-Agent.
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json',
      };
      if (token) headers.Token = token;
      const req = https.request(
        {
          host: u.hostname,
          path: u.pathname + u.search,
          method: 'POST',
          headers,
          timeout: 40000,
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
      req.write(payload);
      req.end();
    });
  }

  private async getToken(force = false): Promise<string> {
    const today = new Date().toISOString().slice(0, 10);
    if (!force && this.token && this.tokenDay === today) return this.token;
    const { status, text } = await this.post('/GerarTokenJson', {
      credencial: {
        usuario: process.env.NVCHECK_USER,
        senha: process.env.NVCHECK_PASS,
        cliente: process.env.NVCHECK_CLIENTE,
      },
    });
    let d: any = null;
    try {
      d = JSON.parse(text)?.d;
    } catch {
      /* não-JSON */
    }
    if (status !== 200 || !d || typeof d !== 'string') {
      throw new Error(`GerarToken NvCheck falhou (HTTP ${status})`);
    }
    this.token = d;
    this.tokenDay = today;
    return d;
  }

  /** Telefones do CPF via NVCHECK. [] se não configurado, erro ou sem telefones. */
  async telefonesByCpf(cpf: string): Promise<NvTelefone[]> {
    if (!this.isConfigured()) return [];
    const doc = String(cpf).replace(/\D/g, '');
    if (doc.length < 11) return [];
    try {
      let token = await this.getToken();
      let { status, text } = await this.post(
        '/NVCHECKJson',
        { nvcheck: { Documento: doc } },
        token,
      );
      // token do dia inválido (raro) → regenera 1x
      if (status === 401 || status === 403 || status === 500) {
        token = await this.getToken(true);
        ({ status, text } = await this.post(
          '/NVCHECKJson',
          { nvcheck: { Documento: doc } },
          token,
        ));
      }
      if (status !== 200) return [];
      const data = JSON.parse(text);
      const tels: any[] = data?.d?.CONSULTA?.TELEFONES ?? [];
      return tels
        .filter((t) => t && String(t.TELEFONE || '').trim())
        .map((t) => {
          const ddd = String(t.DDD ?? '').trim();
          const numero = String(t.TELEFONE ?? '').trim();
          const fl = String(t.FLWHATS ?? '').trim().toUpperCase();
          return {
            ddd,
            numero,
            numeroCompleto: `${ddd}${numero}`,
            tipo: t.TIPO_TELEFONE ?? null,
            operadora: t.OPERADORA ?? null,
            whatsapp: fl === 'S' || fl === 'TRUE' || fl === '1',
            melhorHorario: t.BESTTIMETOCALL ?? null,
          };
        });
    } catch (e: any) {
      this.logger.warn(`NvCheck telefonesByCpf falhou: ${e?.message}`);
      return [];
    }
  }
}
