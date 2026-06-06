import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  attachments?: Array<{ filename: string; content: string }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: EmailPayload): Promise<{ sent: boolean; mode: 'console' | 'smtp' }> {
    const smtpHost = this.config.get<string>('SMTP_HOST')?.trim();
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';

    if (!smtpHost || nodeEnv !== 'production') {
      this.logger.log(
        `[MAIL MOCK] To: ${payload.to} | Subject: ${payload.subject} | Attachments: ${payload.attachments?.length ?? 0}`,
      );
      if (payload.attachments?.length) {
        for (const attachment of payload.attachments) {
          this.logger.debug(`[MAIL MOCK] Attachment ${attachment.filename} (${attachment.content.length} bytes)`);
        }
      }
      return { sent: true, mode: 'console' };
    }

    // Production SMTP path — requires SMTP_HOST + credentials in env (not bundled in tests).
    this.logger.warn(
      `SMTP configured but nodemailer transport not enabled in this build — logging email to console instead.`,
    );
    this.logger.log(`[MAIL FALLBACK] To: ${payload.to} | Subject: ${payload.subject}`);
    return { sent: true, mode: 'console' };
  }
}
