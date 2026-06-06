export type PromoTypeValue = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromoApplyToValue = 'ALL' | 'CATEGORY' | 'PRODUCT';

export interface PromoCartLine {
  productId: string;
  categoryId: string | null;
  lineSubtotal: number;
}

export interface PromoRuleInput {
  id: string;
  name: string;
  type: PromoTypeValue;
  value: number;
  applyTo: PromoApplyToValue;
  categoryId: string | null;
  productId: string | null;
  minPurchase: number | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PromoCalculationResult {
  promoRuleId: string;
  promoName: string;
  discountAmount: number;
  subtotalBefore: number;
  subtotalAfter: number;
}

function roundIdr(value: number): number {
  return Math.max(0, Math.floor(value));
}

export function isPromoActive(rule: PromoRuleInput, now = new Date()): boolean {
  if (!rule.isActive) {
    return false;
  }
  if (rule.startsAt && new Date(rule.startsAt) > now) {
    return false;
  }
  if (rule.endsAt && new Date(rule.endsAt) < now) {
    return false;
  }
  return true;
}

function applicableSubtotal(rule: PromoRuleInput, lines: PromoCartLine[]): number {
  if (rule.applyTo === 'ALL') {
    return lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  }
  if (rule.applyTo === 'CATEGORY' && rule.categoryId) {
    return lines
      .filter((line) => line.categoryId === rule.categoryId)
      .reduce((sum, line) => sum + line.lineSubtotal, 0);
  }
  if (rule.applyTo === 'PRODUCT' && rule.productId) {
    return lines
      .filter((line) => line.productId === rule.productId)
      .reduce((sum, line) => sum + line.lineSubtotal, 0);
  }
  return 0;
}

export function calculatePromoDiscount(
  rule: PromoRuleInput,
  lines: PromoCartLine[],
  now = new Date(),
): PromoCalculationResult | null {
  if (!isPromoActive(rule, now)) {
    return null;
  }

  const cartSubtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  if (cartSubtotal <= 0) {
    return null;
  }

  if (rule.minPurchase != null && cartSubtotal < rule.minPurchase) {
    return null;
  }

  const base = applicableSubtotal(rule, lines);
  if (base <= 0) {
    return null;
  }

  let discountAmount = 0;
  if (rule.type === 'PERCENTAGE') {
    discountAmount = roundIdr((base * rule.value) / 100);
  } else {
    discountAmount = roundIdr(Math.min(rule.value, base));
  }

  if (discountAmount <= 0) {
    return null;
  }

  discountAmount = Math.min(discountAmount, cartSubtotal);

  return {
    promoRuleId: rule.id,
    promoName: rule.name,
    discountAmount,
    subtotalBefore: cartSubtotal,
    subtotalAfter: cartSubtotal - discountAmount,
  };
}

export function pickBestPromo(
  rules: PromoRuleInput[],
  lines: PromoCartLine[],
  now = new Date(),
): PromoCalculationResult | null {
  let best: PromoCalculationResult | null = null;
  for (const rule of rules) {
    const result = calculatePromoDiscount(rule, lines, now);
    if (!result) {
      continue;
    }
    if (!best || result.discountAmount > best.discountAmount) {
      best = result;
    }
  }
  return best;
}
