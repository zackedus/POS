import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { MidtransService } from '../online-orders/midtrans.service';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

export type MidtransMode = 'mock' | 'sandbox' | 'live';

export interface MidtransConfigView {
  mode: MidtransMode;
  isProduction: boolean;
  serverKeyConfigured: boolean;
  serverKeyMasked: string | null;
  keySource: 'env' | 'tenant' | 'none';
  webhookPath: string;
}

export interface TenantSettingsView {
  ppnEnabled: boolean;
  ppnRatePercent: number;
  midtrans: MidtransConfigView;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly midtrans: MidtransService,
  ) {}

  async getTenantSettings(user: AuthJwtPayload): Promise<TenantSettingsView> {
    const row = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    return this.buildView(row);
  }

  async updateTenantSettings(user: AuthJwtPayload, dto: UpdateTenantSettingsDto): Promise<TenantSettingsView> {
    const data: {
      ppnEnabled?: boolean;
      ppnRatePercent?: number;
      midtransServerKey?: string | null;
      midtransIsProduction?: boolean;
    } = {};

    if (dto.ppnEnabled !== undefined) data.ppnEnabled = dto.ppnEnabled;
    if (dto.ppnRatePercent !== undefined) data.ppnRatePercent = dto.ppnRatePercent;
    if (dto.midtransIsProduction !== undefined) data.midtransIsProduction = dto.midtransIsProduction;
    if (dto.clearMidtransServerKey) {
      data.midtransServerKey = null;
    } else if (dto.midtransServerKey !== undefined) {
      const trimmed = dto.midtransServerKey.trim();
      data.midtransServerKey = trimmed.length > 0 ? trimmed : null;
    }

    const row = await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        ppnEnabled: data.ppnEnabled ?? false,
        ppnRatePercent: data.ppnRatePercent ?? 11,
        midtransServerKey: data.midtransServerKey ?? null,
        midtransIsProduction: data.midtransIsProduction ?? false,
      },
      update: data,
    });

    return this.buildView(row);
  }

  async testMidtransConnection(user: AuthJwtPayload): Promise<{
    ok: boolean;
    mode: MidtransMode;
    statusCode: number;
    message: string;
  }> {
    const view = await this.getTenantSettings(user);
    if (view.midtrans.mode === 'mock') {
      return {
        ok: true,
        mode: 'mock',
        statusCode: 200,
        message: 'Mode mock — tidak ada ping gateway. Simpan server key sandbox untuk uji koneksi.',
      };
    }

    const envKey = this.config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
    const tenantKey = row?.midtransServerKey?.trim();
    const serverKey = tenantKey || envKey || '';
    const isProduction = row?.midtransIsProduction ?? this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';

    const ping = await this.midtrans.pingConnection({ serverKey, isProduction });
    return {
      ok: ping.ok,
      mode: view.midtrans.mode,
      statusCode: ping.statusCode,
      message: ping.message,
    };
  }

  getMidtransWebhookHealth(): ReturnType<MidtransService['getWebhookHealth']> {
    return this.midtrans.getWebhookHealth();
  }

  private buildView(
    row: {
      ppnEnabled: boolean;
      ppnRatePercent: { toString(): string };
      midtransServerKey: string | null;
      midtransIsProduction: boolean;
    } | null,
  ): TenantSettingsView {
    const envKey = this.config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
    const tenantKey = row?.midtransServerKey?.trim();
    const effectiveKey = tenantKey || envKey || null;
    const keySource: MidtransConfigView['keySource'] = tenantKey
      ? 'tenant'
      : envKey
        ? 'env'
        : 'none';

    const isProduction =
      row?.midtransIsProduction ?? this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';

    let mode: MidtransMode = 'mock';
    if (effectiveKey) {
      mode = isProduction ? 'live' : 'sandbox';
    }

    return {
      ppnEnabled: row?.ppnEnabled ?? false,
      ppnRatePercent: row ? Number(row.ppnRatePercent) : 11,
      midtrans: {
        mode,
        isProduction,
        serverKeyConfigured: Boolean(effectiveKey),
        serverKeyMasked: maskServerKey(effectiveKey),
        keySource,
        webhookPath: '/api/v1/webhooks/midtrans',
      },
    };
  }
}

export function maskServerKey(key: string | null | undefined): string | null {
  if (!key?.trim()) return null;
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 6)}****${trimmed.slice(-4)}`;
}
