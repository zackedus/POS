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

export interface MidtransRuntimeConfig {
  serverKey?: string | null;
  isProduction?: boolean;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  constructor(private readonly config: ConfigService) {}

  resolveRuntimeConfig(override?: MidtransRuntimeConfig): {
    serverKey: string | undefined;
    isProduction: boolean;
  } {
    const envKey = this.config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
    const tenantKey = override?.serverKey?.trim();
    const effectiveKey = tenantKey || envKey || undefined;
    const isProduction =
      override?.isProduction ??
      this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
    return { serverKey: effectiveKey, isProduction };
  }

  isMockMode(override?: MidtransRuntimeConfig): boolean {
    return !this.resolveRuntimeConfig(override).serverKey?.trim();
  }

  verifySignature(
    notification: MidtransNotification,
    override?: MidtransRuntimeConfig,
  ): boolean {
    const { serverKey, isProduction } = this.resolveRuntimeConfig(override);

    if (!serverKey) {
      if (isProduction) {
        this.logger.warn('Webhook ditolak — mode produksi tanpa server key.');
        return false;
      }
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

  async createSnapPayment(
    input: {
      orderId: string;
      orderNo: string;
      tenantSlug: string;
      grossAmount: number;
      customerName: string;
      customerPhone: string;
    },
    override?: MidtransRuntimeConfig,
  ): Promise<SnapPaymentResult> {
    const { serverKey, isProduction } = this.resolveRuntimeConfig(override);

    if (!serverKey) {
      const base = this.config.get<string>('STOREFRONT_BASE_URL') ?? 'http://localhost:3001';
      const token = `mock-snap-${input.orderId}`;
      return {
        snapToken: token,
        redirectUrl: `${base}/store/${input.tenantSlug}/order/${input.orderNo}/success?mockPaid=1`,
      };
    }

    const apiBaseUrl = isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';
    const snapBaseUrl = isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';

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

    const response = await fetch(`${apiBaseUrl}/snap/v1/transactions`, {
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
      redirectUrl: data.redirect_url ?? `${snapBaseUrl}/snap/v2/vtweb/${data.token}`,
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

  getWebhookHealth(override?: MidtransRuntimeConfig): {
    endpoint: string;
    mockMode: boolean;
    signatureVerification: boolean;
    productionMode: boolean;
    strictProductionWebhook: boolean;
  } {
    const { serverKey, isProduction } = this.resolveRuntimeConfig(override);
    const mockMode = !serverKey?.trim();
    const skipVerify = this.config.get<string>('MIDTRANS_WEBHOOK_SKIP_VERIFY') === 'true';
    return {
      endpoint: '/api/v1/webhooks/midtrans/online',
      mockMode,
      signatureVerification: mockMode ? !skipVerify : true,
      productionMode: isProduction,
      strictProductionWebhook: isProduction && !mockMode,
    };
  }
}
