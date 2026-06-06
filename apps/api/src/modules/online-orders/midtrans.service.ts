import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { ErrorCodes } from '@barokah/shared';
import { BadGatewayException } from '@nestjs/common';

export interface SnapPaymentResult {
  snapToken: string;
  redirectUrl: string;
}

export interface MidtransNotification {
  order_id: string;
  transaction_status: string;
  status_code: string;
  gross_amount: string;
  signature_key?: string;
  payment_type?: string;
  transaction_id?: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  constructor(private readonly config: ConfigService) {}

  private get serverKey(): string | undefined {
    return this.config.get<string>('MIDTRANS_SERVER_KEY');
  }

  private get isProduction(): boolean {
    return this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
  }

  private get snapBaseUrl(): string {
    return this.isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
  }

  private get apiBaseUrl(): string {
    return this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
  }

  isMockMode(): boolean {
    return !this.serverKey?.trim();
  }

  verifySignature(notification: MidtransNotification): boolean {
    const serverKey = this.serverKey;
    if (!serverKey) {
      return this.config.get<string>('MIDTRANS_WEBHOOK_SKIP_VERIFY') === 'true';
    }
    if (!notification.signature_key) {
      return false;
    }
    const payload = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
    const expected = createHash('sha512').update(payload).digest('hex');
    return expected === notification.signature_key;
  }

  isPaidNotification(notification: MidtransNotification): boolean {
    return ['settlement', 'capture'].includes(notification.transaction_status);
  }

  isCancelledNotification(notification: MidtransNotification): boolean {
    return ['expire', 'cancel', 'deny', 'failure'].includes(notification.transaction_status);
  }

  async createSnapPayment(input: {
    orderId: string;
    orderNo: string;
    tenantSlug: string;
    grossAmount: number;
    customerName: string;
    customerPhone: string;
  }): Promise<SnapPaymentResult> {
    if (this.isMockMode()) {
      const base = this.config.get<string>('STOREFRONT_BASE_URL') ?? 'http://localhost:3001';
      const token = `mock-snap-${input.orderId}`;
      return {
        snapToken: token,
        redirectUrl: `${base}/store/${input.tenantSlug}/order/${input.orderNo}/success?mockPaid=1`,
      };
    }

    const serverKey = this.serverKey as string;
    const body = {
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      customer_details: {
        first_name: input.customerName,
        phone: input.customerPhone,
      },
    };

    const response = await fetch(`${this.apiBaseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString('base64')}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Midtrans Snap failed: ${response.status} ${text}`);
      throw new BadGatewayException({
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
        message: 'Gagal membuat sesi pembayaran. Silakan coba lagi.',
      });
    }

    const data = (await response.json()) as { token: string; redirect_url: string };
    return {
      snapToken: data.token,
      redirectUrl: data.redirect_url ?? `${this.snapBaseUrl}/snap/v2/vtweb/${data.token}`,
    };
  }

  /** Ping Midtrans API — sandbox/live based on server key + production flag. */
  async pingConnection(input: {
    serverKey: string;
    isProduction: boolean;
  }): Promise<{ ok: boolean; statusCode: number; message: string }> {
    const key = input.serverKey.trim();
    if (!key) {
      return { ok: false, statusCode: 0, message: 'Server key belum dikonfigurasi — mode mock aktif.' };
    }

    const apiBase = input.isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    try {
      const response = await fetch(`${apiBase}/v2/ping`, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
        },
      });
      if (response.ok) {
        return {
          ok: true,
          statusCode: response.status,
          message: input.isProduction ? 'Koneksi live Midtrans OK.' : 'Koneksi sandbox Midtrans OK.',
        };
      }
      const text = await response.text();
      return {
        ok: false,
        statusCode: response.status,
        message: `Midtrans ping gagal (${response.status}): ${text.slice(0, 120)}`,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Koneksi Midtrans gagal.';
      return { ok: false, statusCode: 0, message };
    }
  }

  getWebhookHealth(): {
    endpoint: string;
    mockMode: boolean;
    signatureVerification: boolean;
  } {
    return {
      endpoint: '/api/v1/webhooks/midtrans/online',
      mockMode: this.isMockMode(),
      signatureVerification: !this.isMockMode() || this.config.get<string>('MIDTRANS_WEBHOOK_SKIP_VERIFY') !== 'true',
    };
  }
}
