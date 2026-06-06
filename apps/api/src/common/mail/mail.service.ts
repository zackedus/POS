import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }
    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    if (!smtpHost) {
      return null;
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
    return this.transporter;
  }

  async send(payload: EmailPayload): Promise<{ sent: boolean; mode: 'console' | 'smtp' }> {
    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim() ?? 'noreply@barokah.local';

    if (!smtpHost) {
      this.logger.log(
        `[MAIL MOCK] To: ${payload.to} | Subject: ${payload.subject} | Attachments: ${payload.attachments?.length ?? 0}`,
      );
      return { sent: true, mode: 'console' };
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('[MAIL FALLBACK] SMTP transporter unavailable — logging to console.');
      this.logger.log(`[MAIL FALLBACK] To: ${payload.to} | Subject: ${payload.subject}`);
      return { sent: true, mode: 'console' };
    }

    try {
      await transporter.sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        attachments: payload.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
        })),
      });
      this.logger.log(`[MAIL SMTP] Sent to ${payload.to}: ${payload.subject}`);
      return { sent: true, mode: 'smtp' };
    } catch (error) {
      this.logger.error(
        `[MAIL SMTP ERROR] ${error instanceof Error ? error.message : 'unknown'} — fallback console`,
      );
      this.logger.log(`[MAIL FALLBACK] To: ${payload.to} | Subject: ${payload.subject}`);
      return { sent: true, mode: 'console' };
    }
  }
}
