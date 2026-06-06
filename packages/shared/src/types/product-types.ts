/** Product classification for progressive-disclosure UX. Inferred from DB flags — no dedicated column. */
export enum ProductType {
  SIMPLE = 'SIMPLE',
  MULTI_UNIT = 'MULTI_UNIT',
  VARIANT = 'VARIANT',
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  [ProductType.SIMPLE]: 'Sederhana',
  [ProductType.MULTI_UNIT]: 'Multi-satuan',
  [ProductType.VARIANT]: 'Induk varian',
};

export const PRODUCT_TYPE_DESCRIPTIONS: Record<ProductType, string> = {
  [ProductType.SIMPLE]: 'Satu satuan untuk stok dan jual (pcs, sak).',
  [ProductType.MULTI_UNIT]: 'Beli dan jual pakai satuan berbeda; stok di satuan dasar (contoh: paku dus → kg).',
  [ProductType.VARIANT]:
    'Ukuran/merek berbeda = SKU & harga sendiri (contoh: Cat 5L Rp 85rb vs 25L Rp 350rb). Bukan konversi satuan.',
};

/** Draft row for VARIANT parent wizard — each row becomes a child SKU on save. */
export interface VariantDraft {
  id: string;
  variantLabel: string;
  sku: string;
  price: string;
  costPrice?: string;
  stockQty?: string;
  skuManuallyEdited?: boolean;
}

export interface UnitConversionDraft {
  unitId: string;
  conversionToBase: number;
  isPurchaseUnit: boolean;
  isSellUnit: boolean;
  sellStep?: number;
  minQty?: number;
}

export interface ProductFormInput {
  sku: string;
  name: string;
  price: string;
  costPrice?: string;
  unitId: string;
  categoryId?: string;
  productType: ProductType;
  hasVariants?: boolean;
  parentProductId?: string;
  variantLabel?: string;
  sellOnline?: boolean;
  imageUrl?: string;
  moq?: string;
  orderStep?: string;
  /** Draft conversions for create flow (applied after product saved). */
  unitConversions?: UnitConversionDraft[];
  /** Draft variant rows for VARIANT parent create flow. */
  variantDrafts?: VariantDraft[];
  /** Initial stock qty in base unit (create flow, non-variant). */
  initialStockQty?: string;
}

export interface ProductFormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  messages: string[];
}
