import { calculatePromoDiscount, pickBestPromo, type PromoCartLine, type PromoRuleInput } from '@barokah/shared';
import { apiConfig } from './api';
import { authFetch } from './auth';
import type { PromoRuleView } from './promotions-api';

const PROMO_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/promotions`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface PromoValidationResult {
  applicable: boolean;
  promoRuleId?: string;
  promoName?: string;
  discountAmount: number;
  subtotalBefore?: number;
  subtotalAfter: number;
  message?: string;
}

export async function fetchActivePromos(): Promise<PromoRuleView[]> {
  const res = await authFetch(`${PROMO_BASE}/active`);
  const json = (await res.json()) as ApiEnvelope<{ promos: PromoRuleView[] }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat promo aktif.');
  }
  return json.data.promos;
}

export async function validatePromoAtCheckout(input: {
  items: Array<{ productId: string; quantity: number; sellUnitId?: string }>;
  promoRuleId?: string | null;
}): Promise<PromoValidationResult> {
  const res = await authFetch(`${PROMO_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: input.items,
      ...(input.promoRuleId ? { promoRuleId: input.promoRuleId } : {}),
    }),
  });
  const json = (await res.json()) as ApiEnvelope<PromoValidationResult>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memvalidasi promo.');
  }
  return json.data;
}

export function formatPromoTargetingLabel(promo: PromoRuleView): string {
  if (promo.applyTo === 'CATEGORY' && promo.categoryName) {
    return `Kategori: ${promo.categoryName}`;
  }
  if (promo.applyTo === 'PRODUCT' && promo.productName) {
    return `Produk: ${promo.productName}`;
  }
  if (promo.applyTo === 'ALL') {
    return 'Semua produk';
  }
  return 'Target khusus';
}

export function isPromoApplicableToCart(
  promo: PromoRuleView,
  lines: PromoCartLine[],
): boolean {
  const rule: PromoRuleInput = {
    id: promo.id,
    name: promo.name,
    type: promo.type,
    value: promo.value,
    applyTo: promo.applyTo,
    categoryId: promo.categoryId,
    productId: promo.productId,
    minPurchase: promo.minPurchase,
    isActive: promo.isActive,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
  };
  return calculatePromoDiscount(rule, lines) != null;
}

export function previewPromoLocally(
  promos: PromoRuleView[],
  lines: PromoCartLine[],
  selectedPromoId?: string | null,
): PromoValidationResult {
  const rules: PromoRuleInput[] = promos.map((promo) => ({
    id: promo.id,
    name: promo.name,
    type: promo.type,
    value: promo.value,
    applyTo: promo.applyTo,
    categoryId: promo.categoryId,
    productId: promo.productId,
    minPurchase: promo.minPurchase,
    isActive: promo.isActive,
    startsAt: promo.startsAt,
    endsAt: promo.endsAt,
  }));

  const selected = selectedPromoId ? rules.find((rule) => rule.id === selectedPromoId) : null;
  const result = selected ? calculatePromoDiscount(selected, lines) : pickBestPromo(rules, lines);
  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);

  if (!result) {
    return {
      applicable: false,
      discountAmount: 0,
      subtotalBefore: subtotal,
      subtotalAfter: subtotal,
    };
  }

  return {
    applicable: true,
    promoRuleId: result.promoRuleId,
    promoName: result.promoName,
    discountAmount: result.discountAmount,
    subtotalBefore: result.subtotalBefore,
    subtotalAfter: result.subtotalAfter,
  };
}

export { calculatePromoDiscount, pickBestPromo };
export type { PromoCartLine };
