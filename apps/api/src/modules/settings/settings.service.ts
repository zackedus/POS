import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCodes } from '@barokah/shared';
import { UserRole } from '@barokah/database';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { MidtransService } from '../online-orders/midtrans.service';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

export type MidtransMode = 'mock' | 'sandbox' | 'live';

export interface MidtransConfigView {
  mode: MidtransMode;
  isProduction: boolean;
  serverKeyConfigured: boolean;
  serverKeyMasked: string | null;
  keySource: 'env' | 'tenant' | 'none';
  webhookPath: string;
  productionGuardrails: {
    liveRequiresServerKey: boolean;
    webhookStrictInProduction: boolean;
    warnings: string[];
  };
}

export interface TenantSettingsView {
  ppnEnabled: boolean;
  ppnRatePercent: number;
  weeklyReportEmailEnabled: boolean;
  loyaltyPointsEnabled: boolean;
  loyaltyEarnRateIdr: number;
  loyaltyRedeemEnabled: boolean;
  loyaltyRedeemValueIdr: number;
  loyaltyRedeemMaxPercent: number;
  midtrans: MidtransConfigView;
}

export interface TenantProfileView {
  id: string;
  name: string;
  slug: string;
  contactPhone: string | null;
  logoUrl: string | null;
  isActive: boolean;
  updatedAt: string;
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

  async getTenantProfile(user: AuthJwtPayload): Promise<TenantProfileView> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        contactPhone: true,
        logoUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new ForbiddenException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Profil toko tidak ditemukan.',
      });
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      contactPhone: tenant.contactPhone,
      logoUrl: tenant.logoUrl,
      isActive: tenant.isActive,
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  async updateTenantProfile(user: AuthJwtPayload, dto: UpdateTenantProfileDto): Promise<TenantProfileView> {
    if (user.role !== UserRole.OWNER && dto.name !== undefined) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Hanya pemilik yang dapat mengubah nama toko.',
      });
    }

    const data: {
      name?: string;
      contactPhone?: string | null;
      logoUrl?: string | null;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone?.trim() || null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;

    const tenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        contactPhone: true,
        logoUrl: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      contactPhone: tenant.contactPhone,
      logoUrl: tenant.logoUrl,
      isActive: tenant.isActive,
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  async updateTenantSettings(user: AuthJwtPayload, dto: UpdateTenantSettingsDto): Promise<TenantSettingsView> {
    const isOwner = user.role === UserRole.OWNER;
    if (!isOwner) {
      const touchesOwnerOnly =
        dto.midtransServerKey !== undefined ||
        dto.midtransIsProduction !== undefined ||
        dto.clearMidtransServerKey === true ||
        dto.weeklyReportEmailEnabled !== undefined;
      if (touchesOwnerOnly) {
        throw new ForbiddenException({
          code: ErrorCodes.FORBIDDEN,
          message: 'Hanya pemilik yang dapat mengubah pengaturan Midtrans dan laporan email.',
        });
      }
    }

    const data: {
      ppnEnabled?: boolean;
      ppnRatePercent?: number;
      midtransServerKey?: string | null;
      midtransIsProduction?: boolean;
      weeklyReportEmailEnabled?: boolean;
      loyaltyPointsEnabled?: boolean;
      loyaltyEarnRateIdr?: number;
      loyaltyRedeemEnabled?: boolean;
      loyaltyRedeemValueIdr?: number;
      loyaltyRedeemMaxPercent?: number;
    } = {};

    if (dto.ppnEnabled !== undefined) data.ppnEnabled = dto.ppnEnabled;
    if (dto.ppnRatePercent !== undefined) data.ppnRatePercent = dto.ppnRatePercent;
    if (dto.weeklyReportEmailEnabled !== undefined) {
      data.weeklyReportEmailEnabled = dto.weeklyReportEmailEnabled;
    }
    if (dto.loyaltyPointsEnabled !== undefined) {
      data.loyaltyPointsEnabled = dto.loyaltyPointsEnabled;
    }
    if (dto.loyaltyEarnRateIdr !== undefined) {
      data.loyaltyEarnRateIdr = dto.loyaltyEarnRateIdr;
    }
    if (dto.loyaltyRedeemEnabled !== undefined) {
      data.loyaltyRedeemEnabled = dto.loyaltyRedeemEnabled;
    }
    if (dto.loyaltyRedeemValueIdr !== undefined) {
      data.loyaltyRedeemValueIdr = dto.loyaltyRedeemValueIdr;
    }
    if (dto.loyaltyRedeemMaxPercent !== undefined) {
      data.loyaltyRedeemMaxPercent = dto.loyaltyRedeemMaxPercent;
    }
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
        weeklyReportEmailEnabled: data.weeklyReportEmailEnabled ?? false,
        loyaltyPointsEnabled: data.loyaltyPointsEnabled ?? true,
        loyaltyEarnRateIdr: data.loyaltyEarnRateIdr ?? 10_000,
        loyaltyRedeemEnabled: data.loyaltyRedeemEnabled ?? true,
        loyaltyRedeemValueIdr: data.loyaltyRedeemValueIdr ?? 1_000,
        loyaltyRedeemMaxPercent: data.loyaltyRedeemMaxPercent ?? 50,
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
      weeklyReportEmailEnabled?: boolean;
      loyaltyPointsEnabled?: boolean;
      loyaltyEarnRateIdr?: number;
      loyaltyRedeemEnabled?: boolean;
      loyaltyRedeemValueIdr?: number;
      loyaltyRedeemMaxPercent?: number;
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

    const warnings: string[] = [];
    if (isProduction && !effectiveKey) {
      warnings.push('Mode produksi aktif tanpa server key — checkout online fallback mock.');
    }
    if (isProduction && effectiveKey && keySource === 'env') {
      warnings.push('Live memakai kunci dari env — pertimbangkan simpan per tenant di dashboard.');
    }

    return {
      ppnEnabled: row?.ppnEnabled ?? false,
      ppnRatePercent: row ? Number(row.ppnRatePercent) : 11,
      weeklyReportEmailEnabled: row?.weeklyReportEmailEnabled ?? false,
      loyaltyPointsEnabled: row?.loyaltyPointsEnabled ?? true,
      loyaltyEarnRateIdr: row?.loyaltyEarnRateIdr ?? 10_000,
      loyaltyRedeemEnabled: row?.loyaltyRedeemEnabled ?? true,
      loyaltyRedeemValueIdr: row?.loyaltyRedeemValueIdr ?? 1_000,
      loyaltyRedeemMaxPercent: row?.loyaltyRedeemMaxPercent ?? 50,
      midtrans: {
        mode,
        isProduction,
        serverKeyConfigured: Boolean(effectiveKey),
        serverKeyMasked: maskServerKey(effectiveKey),
        keySource,
        webhookPath: '/api/v1/webhooks/midtrans/online',
        productionGuardrails: {
          liveRequiresServerKey: true,
          webhookStrictInProduction: isProduction,
          warnings,
        },
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
