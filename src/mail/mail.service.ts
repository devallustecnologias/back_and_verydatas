import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  }

  private buildTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  /**
   * Envia a senha provisória. Retorna true se o e-mail saiu;
   * false se SMTP ausente ou falhou.
   */
  async sendPasswordEmail(
    to: string,
    username: string,
    password: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(
        `SMTP não configurado — senha de ${to} não enviada por e-mail`,
      );
      return false;
    }
    const appUrl = process.env.APP_URL ?? 'http://13.140.160.234:8086';
    try {
      await this.buildTransporter().sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Seu acesso ao sistema',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
            <h2 style="color:#1F2937">Bem-vindo(a), ${username}!</h2>
            <p>Sua conta foi criada. Use a senha provisória abaixo para acessar o sistema:</p>
            <p style="font-size:20px;font-weight:bold;background:#F3F4F6;padding:12px 16px;border-radius:8px;letter-spacing:1px">${password}</p>
            <p>Acesse: <a href="${appUrl}/login">${appUrl}/login</a></p>
            <p>Por segurança, recomendamos trocar a senha no primeiro acesso.</p>
          </div>`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${err}`);
      return false;
    }
  }
}
