import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ErrorCodes,
  isMidtransSandboxKey,
  mergeStorefrontSettings,
  validateStorefrontPaymentSettings,
  type StorefrontSettings,
} from '@barokah/shared';
import { UserRole } from '@barokah/database';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { MidtransService } from '../online-orders/midtrans.service';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { UpdateStorefrontSettingsDto } from './dto/update-storefront-settings.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';

export type MidtransMode = 'mock' | 'sandbox' | 'live';

export interface MidtransConfigView {
  mode: MidtransMode;
  isProduction: boolean;
  serverKeyConfigured: boolean;
  serverKeyMasked: string | null;
  clientKeyConfigured: boolean;
  clientKeyMasked: string | null;
  keySource: 'env' | 'tenant' | 'none';
  webhookPath: string;
  webhookUrl: string;
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
  defaultCreditTermsDays: number;
  midtrans: MidtransConfigView;
}

export interface TenantProfileView {
  id: string;
  name: string;
  slug: string;
  contactPhone: string | null;
  whatsapp: string | null;
  description: string | null;
  logoUrl: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface StorefrontSettingsView {
  settings: StorefrontSettings;
  storefrontUrl: string;
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

  async getTenantProfile(user: AuthJwtPayload): Promise<TenantProfileView> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        contactPhone: true,
        whatsapp: true,
        description: true,
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
      whatsapp: tenant.whatsapp,
      description: tenant.description,
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
      whatsapp?: string | null;
      description?: string | null;
      logoUrl?: string | null;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone?.trim() || null;
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp?.trim() || null;
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;

    const tenant = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        contactPhone: true,
        whatsapp: true,
        description: true,
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
      whatsapp: tenant.whatsapp,
      description: tenant.description,
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
        dto.midtransClientKey !== undefined ||
        dto.midtransIsProduction !== undefined ||
        dto.clearMidtransServerKey === true ||
        dto.clearMidtransClientKey === true ||
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
      midtransClientKey?: string | null;
      midtransIsProduction?: boolean;
      weeklyReportEmailEnabled?: boolean;
      loyaltyPointsEnabled?: boolean;
      loyaltyEarnRateIdr?: number;
      loyaltyRedeemEnabled?: boolean;
      loyaltyRedeemValueIdr?: number;
      loyaltyRedeemMaxPercent?: number;
      defaultCreditTermsDays?: number;
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
    if (dto.defaultCreditTermsDays !== undefined) {
      data.defaultCreditTermsDays = dto.defaultCreditTermsDays;
    }
    if (dto.clearMidtransServerKey) {
      data.midtransServerKey = null;
    } else if (dto.midtransServerKey !== undefined) {
      const trimmed = dto.midtransServerKey.trim();
      data.midtransServerKey = trimmed.length > 0 ? trimmed : null;
      if (data.midtransServerKey && isMidtransSandboxKey(data.midtransServerKey)) {
        data.midtransIsProduction = false;
      }
    }

    if (dto.clearMidtransClientKey) {
      data.midtransClientKey = null;
    } else if (dto.midtransClientKey !== undefined) {
      const trimmed = dto.midtransClientKey.trim();
      data.midtransClientKey = trimmed.length > 0 ? trimmed : null;
    }

    if (dto.midtransIsProduction !== undefined) {
      data.midtransIsProduction = dto.midtransIsProduction;
    }

    const row = await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        ppnEnabled: data.ppnEnabled ?? false,
        ppnRatePercent: data.ppnRatePercent ?? 11,
        midtransServerKey: data.midtransServerKey ?? null,
        midtransClientKey: data.midtransClientKey ?? null,
        midtransIsProduction: data.midtransIsProduction ?? false,
        weeklyReportEmailEnabled: data.weeklyReportEmailEnabled ?? false,
        loyaltyPointsEnabled: data.loyaltyPointsEnabled ?? true,
        loyaltyEarnRateIdr: data.loyaltyEarnRateIdr ?? 10_000,
        loyaltyRedeemEnabled: data.loyaltyRedeemEnabled ?? true,
        loyaltyRedeemValueIdr: data.loyaltyRedeemValueIdr ?? 1_000,
        loyaltyRedeemMaxPercent: data.loyaltyRedeemMaxPercent ?? 50,
        defaultCreditTermsDays: data.defaultCreditTermsDays ?? 30,
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

  async getStorefrontSettings(user: AuthJwtPayload): Promise<StorefrontSettingsView> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId },
      select: { name: true, slug: true },
    });
    if (!tenant) {
      throw new ForbiddenException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Profil toko tidak ditemukan.',
      });
    }

    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
    const settings = mergeStorefrontSettings(row?.storefrontSettings, tenant.name);
    const midtrans = (await this.getTenantSettings(user)).midtrans;

    return {
      settings,
      storefrontUrl: `/store/${tenant.slug}`,
      midtrans,
    };
  }

  async updateStorefrontSettings(
    user: AuthJwtPayload,
    dto: UpdateStorefrontSettingsDto,
  ): Promise<StorefrontSettingsView> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: user.tenantId },
      select: { name: true, slug: true },
    });
    if (!tenant) {
      throw new ForbiddenException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Profil toko tidak ditemukan.',
      });
    }

    const existing = await this.prisma.tenantSettings.findUnique({ where: { tenantId: user.tenantId } });
    const current = mergeStorefrontSettings(existing?.storefrontSettings, tenant.name);
    const merged = mergeStorefrontSettings({ ...current, ...dto }, tenant.name);
    const midtransView = this.buildMidtransView(existing);
    const paymentValidation = validateStorefrontPaymentSettings(
      merged,
      midtransView.serverKeyConfigured,
    );
    if (paymentValidation.errors.length > 0) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: paymentValidation.errors[0],
        details: paymentValidation.errors.map((message) => ({ field: 'payment', message })),
      });
    }

    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: {
        tenantId: user.tenantId,
        storefrontSettings: merged as object,
      },
      update: {
        storefrontSettings: merged as object,
      },
    });

    return this.getStorefrontSettings(user);
  }

  private buildView(
    row: {
      ppnEnabled: boolean;
      ppnRatePercent: { toString(): string };
      midtransServerKey: string | null;
      midtransClientKey?: string | null;
      midtransIsProduction: boolean;
      weeklyReportEmailEnabled?: boolean;
      loyaltyPointsEnabled?: boolean;
      loyaltyEarnRateIdr?: number;
      loyaltyRedeemEnabled?: boolean;
      loyaltyRedeemValueIdr?: number;
      loyaltyRedeemMaxPercent?: number;
      defaultCreditTermsDays?: number;
    } | null,
  ): TenantSettingsView {
    const midtrans = this.buildMidtransView(row);

    return {
      ppnEnabled: row?.ppnEnabled ?? false,
      ppnRatePercent: row ? Number(row.ppnRatePercent) : 11,
      weeklyReportEmailEnabled: row?.weeklyReportEmailEnabled ?? false,
      loyaltyPointsEnabled: row?.loyaltyPointsEnabled ?? true,
      loyaltyEarnRateIdr: row?.loyaltyEarnRateIdr ?? 10_000,
      loyaltyRedeemEnabled: row?.loyaltyRedeemEnabled ?? true,
      loyaltyRedeemValueIdr: row?.loyaltyRedeemValueIdr ?? 1_000,
      loyaltyRedeemMaxPercent: row?.loyaltyRedeemMaxPercent ?? 50,
      defaultCreditTermsDays: row?.defaultCreditTermsDays ?? 30,
      midtrans,
    };
  }

  private buildMidtransView(
    row: {
      midtransServerKey: string | null;
      midtransClientKey?: string | null;
      midtransIsProduction: boolean;
    } | null,
  ): MidtransConfigView {
    const envKey = this.config.get<string>('MIDTRANS_SERVER_KEY')?.trim();
    const tenantKey = row?.midtransServerKey?.trim();
    const effectiveKey = tenantKey || envKey || null;
    const tenantClientKey = row?.midtransClientKey?.trim() || null;
    const keySource: MidtransConfigView['keySource'] = tenantKey
      ? 'tenant'
      : envKey
        ? 'env'
        : 'none';

    let isProduction =
      row?.midtransIsProduction ?? this.config.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
    if (effectiveKey && isMidtransSandboxKey(effectiveKey)) {
      isProduction = false;
    }

    const mode = this.midtrans.resolvePaymentMode({
      serverKey: effectiveKey,
      isProduction,
    });

    const webhookPath = '/api/v1/webhooks/midtrans/online';
    const apiPublicBase =
      this.config.get<string>('API_PUBLIC_BASE_URL')?.replace(/\/$/, '') ??
      this.config.get<string>('NEXT_PUBLIC_API_URL')?.replace(/\/$/, '') ??
      `http://localhost:${this.config.get<string>('PORT') ?? '3000'}`;

    const warnings: string[] = [];
    if (isProduction && !effectiveKey) {
      warnings.push('Mode produksi aktif tanpa server key — checkout online fallback mock.');
    }
    if (isProduction && effectiveKey && keySource === 'env') {
      warnings.push('Live memakai kunci dari env — pertimbangkan simpan per tenant di dashboard.');
    }
    if (effectiveKey && isMidtransSandboxKey(effectiveKey) && row?.midtransIsProduction) {
      warnings.push('Server key sandbox terdeteksi — mode otomatis dianggap sandbox.');
    }

    return {
      mode,
      isProduction,
      serverKeyConfigured: Boolean(effectiveKey),
      serverKeyMasked: maskServerKey(effectiveKey),
      clientKeyConfigured: Boolean(tenantClientKey),
      clientKeyMasked: maskServerKey(tenantClientKey),
      keySource,
      webhookPath,
      webhookUrl: `${apiPublicBase}${webhookPath}`,
      productionGuardrails: {
        liveRequiresServerKey: true,
        webhookStrictInProduction: isProduction,
        warnings,
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
