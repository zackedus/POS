export interface MarginWarningItem {
  productId: string;
  productName: string;
  message: string;
}

export const NEGATIVE_MARGIN_MESSAGE = 'Harga jual di bawah modal — margin negatif';

export function buildNegativeMarginWarning(productName: string): string {
  return `${NEGATIVE_MARGIN_MESSAGE} (${productName})`;
}

export function detectNegativeMargin(params: {
  productId: string;
  productName: string;
  sellPrice: number;
  costPrice: number;
}): MarginWarningItem | null {
  if (params.costPrice <= 0) {
    return null;
  }
  if (params.sellPrice >= params.costPrice) {
    return null;
  }
  return {
    productId: params.productId,
    productName: params.productName,
    message: buildNegativeMarginWarning(params.productName),
  };
}

export function computeBundleEffectiveCost(
  bundleCostPrice: number,
  components: Array<{ costPrice: number; quantity: number }>,
): number {
  if (bundleCostPrice > 0) {
    return bundleCostPrice;
  }
  return components.reduce((sum, component) => sum + component.costPrice * component.quantity, 0);
}
