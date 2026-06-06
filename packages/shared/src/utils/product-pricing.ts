import { formatCurrencyIDR } from './format-currency';

/** Sell price for one purchase/package unit derived from base (ecer) price. */
export function derivePackageSellPrice(baseSellPrice: number, conversionToBase: number): number {
  if (baseSellPrice <= 0 || conversionToBase <= 0) return 0;
  return Math.round(baseSellPrice * conversionToBase);
}

/** Base-unit cost (HPP) from distributor purchase-unit cost. */
export function deriveBaseCostFromPurchaseCost(
  purchaseCost: number,
  conversionToBase: number,
): number {
  if (purchaseCost <= 0 || conversionToBase <= 0) return 0;
  return Math.round(purchaseCost / conversionToBase);
}

/** Distributor purchase-unit cost from stored base-unit cost. */
export function derivePurchaseCostFromBaseCost(
  baseCost: number,
  conversionToBase: number,
): number {
  if (baseCost <= 0 || conversionToBase <= 0) return 0;
  return Math.round(baseCost * conversionToBase);
}

/** Unit price for POS checkout line when selling in alternate sell unit. */
export function resolveSellUnitPrice(
  baseSellPrice: number,
  quantity: number,
  sellUnitId: string | undefined | null,
  baseUnitId: string,
  conversionToBase: number,
): number {
  if (!sellUnitId || sellUnitId === baseUnitId || quantity <= 0) {
    return baseSellPrice;
  }
  const lineSubtotal = Math.round(baseSellPrice * conversionToBase * quantity);
  return Math.round(lineSubtotal / quantity);
}

/**
 * Human-readable pricing preview for multi-unit products.
 * Example: "1 dus (20 kg) = Rp 360.000 jual / Rp 300.000 beli"
 */
export function formatMultiUnitPricingPreview(options: {
  purchaseSymbol: string;
  baseSymbol: string;
  conversionToBase: number;
  baseSellPrice?: number;
  baseCostPrice?: number;
}): string | null {
  const { purchaseSymbol, baseSymbol, conversionToBase, baseSellPrice, baseCostPrice } = options;
  if (conversionToBase <= 0 || !purchaseSymbol || !baseSymbol) return null;

  const segments: string[] = [];
  if (baseSellPrice != null && baseSellPrice > 0) {
    segments.push(`${formatCurrencyIDR(derivePackageSellPrice(baseSellPrice, conversionToBase))} jual`);
  }
  if (baseCostPrice != null && baseCostPrice > 0) {
    segments.push(
      `${formatCurrencyIDR(derivePurchaseCostFromBaseCost(baseCostPrice, conversionToBase))} beli`,
    );
  }
  if (segments.length === 0) return null;

  return `1 ${purchaseSymbol} (${conversionToBase} ${baseSymbol}) = ${segments.join(' / ')}`;
}
