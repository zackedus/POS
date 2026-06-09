import { apiConfig } from './api';
import { authFetch } from './auth';
import type { StorefrontSettings } from '@barokah/shared';

export type MidtransMode = 'mock' | 'sandbox' | 'live';

export interface MidtransConfigView {
  mode: MidtransMode;
  isProduction: boolean;
  serverKeyConfigured: boolean;
  serverKeyMasked: string | null;
  keySource: 'env' | 'tenant' | 'none';
  webhookPath: string;
  productionGuardrails?: {
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

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const SETTINGS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/settings`;

export async function fetchTenantSettings(): Promise<TenantSettingsView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant`);
  const json = (await res.json()) as ApiEnvelope<TenantSettingsView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat pengaturan tenant.');
  }
  return json.data;
}

export async function updateTenantSettings(input: {
  ppnEnabled?: boolean;
  ppnRatePercent?: number;
  midtransServerKey?: string;
  midtransIsProduction?: boolean;
  weeklyReportEmailEnabled?: boolean;
  loyaltyPointsEnabled?: boolean;
  loyaltyEarnRateIdr?: number;
  loyaltyRedeemEnabled?: boolean;
  loyaltyRedeemValueIdr?: number;
  loyaltyRedeemMaxPercent?: number;
  defaultCreditTermsDays?: number;
  clearMidtransServerKey?: boolean;
}): Promise<TenantSettingsView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<TenantSettingsView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menyimpan pengaturan.');
  }
  return json.data;
}

export function midtransModeLabel(mode: MidtransMode): string {
  if (mode === 'mock') return 'Mock (tanpa gateway)';
  if (mode === 'sandbox') return 'Sandbox Midtrans';
  return 'Live Midtrans';
}

export async function testMidtransConnection(): Promise<{
  ok: boolean;
  mode: MidtransMode;
  statusCode: number;
  message: string;
}> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/midtrans/test`, { method: 'POST' });
  const json = (await res.json()) as ApiEnvelope<{
    ok: boolean;
    mode: MidtransMode;
    statusCode: number;
    message: string;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menguji koneksi Midtrans.');
  }
  return json.data;
}

export async function fetchMidtransWebhookHealth(): Promise<{
  endpoint: string;
  mockMode: boolean;
  signatureVerification: boolean;
}> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/midtrans/webhook-health`);
  const json = (await res.json()) as ApiEnvelope<{
    endpoint: string;
    mockMode: boolean;
    signatureVerification: boolean;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat status webhook Midtrans.');
  }
  return json.data;
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

export async function fetchTenantProfile(): Promise<TenantProfileView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/profile`);
  const json = (await res.json()) as ApiEnvelope<TenantProfileView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat profil toko.');
  }
  return json.data;
}

export async function updateTenantProfile(input: {
  name?: string;
  contactPhone?: string | null;
  whatsapp?: string | null;
  description?: string | null;
  logoUrl?: string | null;
}): Promise<TenantProfileView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<TenantProfileView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menyimpan profil toko.');
  }
  return json.data;
}

export async function fetchStorefrontSettings(): Promise<StorefrontSettingsView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/storefront`);
  const json = (await res.json()) as ApiEnvelope<StorefrontSettingsView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat pengaturan storefront.');
  }
  return json.data;
}

export async function updateStorefrontSettings(
  input: Partial<StorefrontSettings>,
): Promise<StorefrontSettingsView> {
  const res = await authFetch(`${SETTINGS_BASE}/tenant/storefront`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<StorefrontSettingsView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menyimpan pengaturan storefront.');
  }
  return json.data;
}
