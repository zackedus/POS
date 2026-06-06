import { ProductType, type UnitConversionDraft } from '../types/product-types';

export interface ProductTypeSource {
  hasVariants?: boolean;
  parentProductId?: string | null;
  unitConversionCount?: number;
  hasPurchaseUnit?: boolean;
  sellUnitCount?: number;
}

/** Infer product type from existing DB fields — backward compatible, no migration needed. */
export function inferProductType(source: ProductTypeSource): ProductType {
  if (source.hasVariants || source.parentProductId) {
    return ProductType.VARIANT;
  }
  const conversionSignals =
    (source.unitConversionCount ?? 0) > 0 ||
    source.hasPurchaseUnit === true ||
    (source.sellUnitCount ?? 0) > 1;
  if (conversionSignals) {
    return ProductType.MULTI_UNIT;
  }
  return ProductType.SIMPLE;
}

/** Map wizard radio selection to API payload flags. */
export function productTypeToFlags(productType: ProductType): {
  hasVariants: boolean;
} {
  return {
    hasVariants: productType === ProductType.VARIANT,
  };
}

export interface UnitConversionValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate unit conversion rows — shared by web form and API. */
export function validateUnitConversions(
  baseUnitId: string,
  conversions: UnitConversionDraft[],
): UnitConversionValidationResult {
  const errors: string[] = [];
  if (!baseUnitId) {
    errors.push('Satuan dasar (stok) wajib dipilih.');
    return { valid: false, errors };
  }

  const seenUnits = new Set<string>();
  let purchaseCount = 0;

  for (const row of conversions) {
    if (!row.unitId) {
      errors.push('Setiap konversi harus memiliki satuan.');
      continue;
    }
    if (seenUnits.has(row.unitId)) {
      errors.push('Satuan konversi tidak boleh duplikat.');
    }
    seenUnits.add(row.unitId);

    if (row.conversionToBase <= 0) {
      errors.push('Faktor konversi harus lebih dari 0.');
    }

    if (row.isPurchaseUnit) {
      purchaseCount += 1;
      if (row.unitId === baseUnitId) {
        errors.push('Satuan beli harus berbeda dari satuan dasar (stok).');
      }
    }

    if (row.isSellUnit && row.unitId === baseUnitId && row.conversionToBase !== 1) {
      errors.push('Konversi satuan dasar jual harus bernilai 1.');
    }

    if (row.isSellUnit) {
      const step = row.sellStep ?? 1;
      const min = row.minQty ?? step;
      if (step <= 0) errors.push('Step jual harus lebih dari 0.');
      if (min <= 0) errors.push('MOQ jual satuan alternatif harus lebih dari 0.');
    }

    if (!row.isPurchaseUnit && !row.isSellUnit) {
      errors.push('Setiap konversi harus ditandai satuan beli atau satuan jual.');
    }

    if (row.isPurchaseUnit && row.isSellUnit && row.unitId === baseUnitId) {
      errors.push('Satuan beli+jual gabungan harus berbeda dari satuan dasar (stok).');
    }
  }

  if (purchaseCount > 1) {
    errors.push('Hanya satu satuan beli ke supplier yang diperbolehkan per produk.');
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

/** Suggest base unit symbol from category name (anti-error smart default). */
export function suggestBaseUnitSymbol(categoryName?: string | null): string | null {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  if (/seng|atap|galvalum|spandek/.test(lower)) return 'm';
  if (/semen|paku|besi|kayu|pasir|batu/.test(lower)) return 'kg';
  if (/cat|minyak|oli|pelarut/.test(lower)) return 'kg';
  if (/hardware|perkakas|alat/.test(lower)) return 'pcs';
  return null;
}

/** Suggest order step from base unit symbol. */
export function suggestOrderStep(unitSymbol?: string | null): number {
  if (!unitSymbol) return 1;
  const sym = unitSymbol.toLowerCase();
  if (sym === 'kg' || sym === 'liter' || sym === 'l' || sym === 'm' || sym === 'm2' || sym === 'm3') {
    return 0.5;
  }
  return 1;
}

/** Build human-readable conversion preview line. */
export function formatConversionPreview(
  purchaseQty: number,
  purchaseSymbol: string,
  conversionToBase: number,
  baseSymbol: string,
): string {
  const stockQty = Math.round(purchaseQty * conversionToBase * 1000) / 1000;
  return `Beli: ${purchaseQty} ${purchaseSymbol} → +${stockQty} ${baseSymbol} stok`;
}
