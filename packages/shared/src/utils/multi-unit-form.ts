import type { UnitConversionDraft } from '../types/product-types';

/** Simplified multi-unit config matching shop-owner mental model. */
export interface MultiUnitFormConfig {
  purchaseUnitId: string;
  /** 1 purchase unit = N base units (e.g. 1 dus = 20 kg). */
  purchaseConversionToBase: number;
  /** Sell in purchase unit (e.g. per dus) — dual role on purchase conversion row. */
  sellInPurchaseUnit: boolean;
}

export const DEFAULT_PURCHASE_CONVERSION = 20;

/** Parse existing conversion rows into simplified wizard state. */
export function parseMultiUnitConfig(conversions: UnitConversionDraft[] | undefined): MultiUnitFormConfig {
  const purchase = conversions?.find((row) => row.isPurchaseUnit);

  return {
    purchaseUnitId: purchase?.unitId ?? '',
    purchaseConversionToBase: purchase?.conversionToBase ?? DEFAULT_PURCHASE_CONVERSION,
    sellInPurchaseUnit: purchase?.isSellUnit ?? false,
  };
}

/** Build API conversion rows from simplified config. Base-unit sell needs no row. */
export function buildUnitConversionsFromMultiUnit(
  config: MultiUnitFormConfig,
  existing?: UnitConversionDraft[],
): UnitConversionDraft[] {
  const rows: UnitConversionDraft[] = [];

  if (config.purchaseUnitId && config.purchaseConversionToBase > 0) {
    const prev = existing?.find((row) => row.unitId === config.purchaseUnitId);
    rows.push({
      unitId: config.purchaseUnitId,
      conversionToBase: config.purchaseConversionToBase,
      isPurchaseUnit: true,
      isSellUnit: config.sellInPurchaseUnit,
      sellStep: config.sellInPurchaseUnit ? (prev?.sellStep ?? 1) : undefined,
      minQty: config.sellInPurchaseUnit ? (prev?.minQty ?? 1) : undefined,
    });
  }

  for (const row of existing ?? []) {
    if (row.isPurchaseUnit) continue;
    if (row.isSellUnit && row.unitId !== config.purchaseUnitId) {
      rows.push(row);
    }
  }

  return rows;
}

/** Suggest purchase unit symbol from category (e.g. paku → dus, seng → roll). */
export function suggestPurchaseUnitSymbol(categoryName?: string | null): string | null {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  if (/seng|atap|galvalum|spandek/.test(lower)) return 'roll';
  if (/paku|besi|semen|pasir|batu|kayu/.test(lower)) return 'dus';
  if (/cat|minyak|oli/.test(lower)) return 'dus';
  return null;
}

/** Suggest 1 purchase unit = N base units from category (e.g. seng roll → 50 m). */
export function suggestPurchaseConversionToBase(categoryName?: string | null): number | null {
  if (!categoryName) return null;
  const lower = categoryName.toLowerCase();
  if (/seng|atap|galvalum|spandek/.test(lower)) return 50;
  if (/paku/.test(lower)) return 20;
  return null;
}
