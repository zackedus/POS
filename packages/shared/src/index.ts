export * from './types/index';
export * from './constants/index';
export * from './utils/index';

/** Explicit named exports — ensures ESM/tsx interop for product-type utilities. */
export {
  ProductType,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_DESCRIPTIONS,
} from './types/product-types';
export type {
  ProductFormInput,
  ProductFormValidationResult,
  UnitConversionDraft,
  VariantDraft,
} from './types/product-types';
export {
  inferProductType,
  productTypeToFlags,
  validateUnitConversions,
  suggestBaseUnitSymbol,
  suggestOrderStep,
  formatConversionPreview,
} from './utils/product-type';
export {
  buildUnitConversionsFromMultiUnit,
  parseMultiUnitConfig,
  suggestPurchaseUnitSymbol,
  suggestPurchaseConversionToBase,
  DEFAULT_PURCHASE_CONVERSION,
} from './utils/multi-unit-form';
export type { MultiUnitFormConfig } from './utils/multi-unit-form';
export {
  derivePackageSellPrice,
  deriveBaseCostFromPurchaseCost,
  derivePurchaseCostFromBaseCost,
  resolveSellUnitPrice,
  formatMultiUnitPricingPreview,
} from './utils/product-pricing';
export {
  validateProductForm,
  isProductFormSubmittable,
  validateVariantDrafts,
  createEmptyVariantDraft,
} from './utils/validate-product-form';
export {
  slugifyCode,
  deriveNamePrefix,
  randomAlphanumeric,
  generateProductSku,
  generateVariantSku,
  generateCodeFromName,
  generateSupplierCode,
  generateBundleSku,
  generateExpenseRef,
  nextExpenseSequence,
} from './utils/auto-generate';
export type { RandomFn, GenerateProductSkuOptions, GenerateVariantSkuOptions, GenerateExpenseRefOptions } from './utils/auto-generate';
