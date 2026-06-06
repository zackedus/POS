import { apiConfig } from './api';
import { authFetch } from './auth';

export type PromoType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromoApplyTo = 'ALL' | 'CATEGORY' | 'PRODUCT';

export interface PromoRuleView {
  id: string;
  name: string;
  type: PromoType;
  value: number;
  applyTo: PromoApplyTo;
  categoryId: string | null;
  productId: string | null;
  categoryName: string | null;
  productName: string | null;
  minPurchase: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const PROMO_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/promotions`;

export async function fetchPromotions(): Promise<PromoRuleView[]> {
  const res = await authFetch(PROMO_BASE);
  const json = (await res.json()) as ApiEnvelope<{ promos: PromoRuleView[] }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat promo.');
  }
  return json.data.promos;
}

export async function createPromotion(input: {
  name: string;
  type: PromoType;
  value: number;
  applyTo?: PromoApplyTo;
  categoryId?: string;
  productId?: string;
  minPurchase?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}): Promise<PromoRuleView> {
  const res = await authFetch(PROMO_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<PromoRuleView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat promo.');
  }
  return json.data;
}

export async function updatePromotion(
  id: string,
  input: Partial<{
    name: string;
    type: PromoType;
    value: number;
    applyTo: PromoApplyTo;
    categoryId: string | null;
    productId: string | null;
    minPurchase: number | null;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }>,
): Promise<PromoRuleView> {
  const res = await authFetch(`${PROMO_BASE}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiEnvelope<PromoRuleView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui promo.');
  }
  return json.data;
}

export async function deletePromotion(id: string): Promise<void> {
  const res = await authFetch(`${PROMO_BASE}/${id}`, { method: 'DELETE' });
  const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menghapus promo.');
  }
}

export const PROMO_TYPE_LABELS: Record<PromoType, string> = {
  PERCENTAGE: 'Diskon %',
  FIXED_AMOUNT: 'Potongan Rp',
};

export const PROMO_APPLY_LABELS: Record<PromoApplyTo, string> = {
  ALL: 'Semua produk',
  CATEGORY: 'Per kategori',
  PRODUCT: 'Produk tertentu',
};
