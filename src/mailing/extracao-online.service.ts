import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import * as http from 'http';

/**
 * Cliente da API externa de Extração de Consignação Online (tempo real, por
 * NB). Token e URL SEMPRE em env — nunca expostos ao front.
 */
@Injectable()
export class ExtracaoOnlineService {
  private readonly logger = new Logger(ExtracaoOnlineService.name);

  private get baseUrl(): string {
    return (
      process.env.EXTRACAO_ONLINE_BASE_URL || 'http://191.252.196.23/api.php'
    );
  }

  private get accessToken(): string {
    const token = process.env.EXTRACAO_ONLINE_ACCESS_TOKEN;
    if (!token) {
      throw new BadGatewayException(
        'EXTRACAO_ONLINE_ACCESS_TOKEN não configurado',
      );
    }
    return token;
  }

  private rawGet(url: string): Promise<{ status: number; text: string }> {
    return new Promise((resolve) => {
      const req = http.request(
        url,
        { method: 'GET', timeout: 30000 },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
        },
      );
      req.on('error', (e) => resolve({ status: 0, text: 'ERR ' + e.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 0, text: 'timeout' });
      });
      req.end();
    });
  }

  async consultarNb(nb: string): Promise<any> {
    const url = `${this.baseUrl}?acesso=${encodeURIComponent(this.accessToken)}&nb=${encodeURIComponent(nb)}`;
    const { status, text } = await this.rawGet(url);
    if (status < 200 || status >= 300) {
      this.logger.warn(`Extração online falhou (HTTP ${status}) nb=${nb}`);
      throw new BadGatewayException(`Extração online falhou (HTTP ${status})`);
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new BadGatewayException(
        'Extração online retornou resposta inválida (não-JSON)',
      );
    }
  }
}
