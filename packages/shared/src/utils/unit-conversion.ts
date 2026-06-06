export interface ProductUnitConversionLike {
  unitId: string;
  conversionToBase: number;
  isPurchaseUnit: boolean;
  isSellUnit: boolean;
  sellStep?: number | null;
  minQty?: number | null;
  isDefaultSell?: boolean;
}

export function roundQty(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function convertToBaseQuantity(
  quantity: number,
  unitId: string | undefined | null,
  baseUnitId: string,
  conversions: ProductUnitConversionLike[],
): number {
  if (!unitId || unitId === baseUnitId) {
    return roundQty(quantity);
  }

  const conversion = conversions.find((row) => row.unitId === unitId);
  if (!conversion) {
    throw new Error(`Konversi satuan tidak ditemukan untuk unit ${unitId}`);
  }

  return roundQty(quantity * conversion.conversionToBase);
}

export function convertFromBaseQuantity(baseQuantity: number, conversionToBase: number): number {
  if (conversionToBase <= 0) {
    throw new Error('conversionToBase harus lebih dari 0');
  }
  return roundQty(baseQuantity / conversionToBase);
}

export function findPurchaseConversion(
  conversions: ProductUnitConversionLike[],
): ProductUnitConversionLike | undefined {
  return conversions.find((row) => row.isPurchaseUnit);
}

export function findSellConversion(
  conversions: ProductUnitConversionLike[],
  unitId: string,
  baseUnitId: string,
): ProductUnitConversionLike | undefined {
  if (unitId === baseUnitId) {
    return undefined;
  }
  return conversions.find((row) => row.isSellUnit && row.unitId === unitId);
}

export function resolveSellStep(
  unitId: string | undefined | null,
  baseUnitId: string,
  productOrderStep: number,
  conversions: ProductUnitConversionLike[],
): number {
  if (!unitId || unitId === baseUnitId) {
    return productOrderStep > 0 ? productOrderStep : 1;
  }
  const conversion = findSellConversion(conversions, unitId, baseUnitId);
  if (conversion?.sellStep && conversion.sellStep > 0) {
    return conversion.sellStep;
  }
  return 1;
}

export function isValidSellQuantity(
  quantity: number,
  unitId: string | undefined | null,
  baseUnitId: string,
  productMoq: number,
  productOrderStep: number,
  conversions: ProductUnitConversionLike[],
): boolean {
  if (quantity <= 0) {
    return false;
  }

  const step = resolveSellStep(unitId, baseUnitId, productOrderStep, conversions);
  const minQty =
    unitId && unitId !== baseUnitId
      ? (findSellConversion(conversions, unitId, baseUnitId)?.minQty ?? step)
      : productMoq > 0
        ? productMoq
        : step;

  if (quantity + 1e-9 < minQty) {
    return false;
  }

  const stepsFromMin = (quantity - minQty) / step;
  return stepsFromMin >= -1e-9 && Math.abs(stepsFromMin - Math.round(stepsFromMin)) < 1e-6;
}

export function mapPrismaUnitConversions(
  rows: Array<{
    sellUnitId: string;
    conversionToBase: { toString(): string } | number;
    isPurchaseUnit: boolean;
    isSellUnit: boolean;
    sellStep?: { toString(): string } | number | null;
    minQty?: { toString(): string } | number | null;
    isDefaultSell?: boolean;
  }>,
): ProductUnitConversionLike[] {
  return rows.map((row) => ({
    unitId: row.sellUnitId,
    conversionToBase: Number(row.conversionToBase),
    isPurchaseUnit: row.isPurchaseUnit,
    isSellUnit: row.isSellUnit,
    sellStep: row.sellStep != null ? Number(row.sellStep) : null,
    minQty: row.minQty != null ? Number(row.minQty) : null,
    isDefaultSell: row.isDefaultSell,
  }));
}
