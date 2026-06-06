import {
  ProductType,
  type ProductFormInput,
  type ProductFormValidationResult,
  type VariantDraft,
} from '../types/product-types';
import { parseCurrencyInput } from './format-currency';
import { parseQuantityInput } from './format-number';
import { validateUnitConversions } from './product-type';

export function createEmptyVariantDraft(): VariantDraft {
  return {
    id: `vd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variantLabel: '',
    sku: '',
    price: '',
    costPrice: '',
    stockQty: '',
    skuManuallyEdited: false,
  };
}

export function validateVariantDrafts(
  drafts: VariantDraft[] | undefined,
  options?: { requireCost?: boolean },
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const rows = drafts?.filter(
    (row) =>
      row.variantLabel.trim() ||
      row.sku.trim() ||
      row.price.trim() ||
      row.costPrice?.trim() ||
      row.stockQty?.trim(),
  );

  if (!rows?.length) {
    errors.variantDrafts = 'Tambahkan minimal satu varian (ukuran + harga).';
    return { valid: false, errors };
  }

  const skus = new Set<string>();
  rows.forEach((row, index) => {
    const prefix = `variantDrafts[${index}]`;
    if (!row.variantLabel.trim()) {
      errors[`${prefix}.variantLabel`] = `Varian #${index + 1}: ukuran wajib diisi.`;
    }
    if (!row.sku.trim()) {
      errors[`${prefix}.sku`] = `Varian #${index + 1}: SKU wajib diisi.`;
    } else if (skus.has(row.sku.trim())) {
      errors[`${prefix}.sku`] = `SKU "${row.sku.trim()}" duplikat.`;
    } else {
      skus.add(row.sku.trim());
    }
    if (!row.price.trim()) {
      errors[`${prefix}.price`] = `Varian #${index + 1}: harga jual wajib diisi.`;
    } else {
      const price = parseCurrencyInput(row.price);
      if (!Number.isInteger(price) || price < 0) {
        errors[`${prefix}.price`] = `Varian #${index + 1}: harga jual harus rupiah bulat ≥ 0.`;
      }
    }
    if (options?.requireCost && row.costPrice?.trim()) {
      const cost = parseCurrencyInput(row.costPrice);
      if (!Number.isInteger(cost) || cost < 0) {
        errors[`${prefix}.costPrice`] = `Varian #${index + 1}: harga beli harus rupiah bulat ≥ 0.`;
      }
    }
    if (row.stockQty?.trim()) {
      const stock = parseQuantityInput(row.stockQty);
      if (stock < 0) {
        errors[`${prefix}.stockQty`] = `Varian #${index + 1}: stok awal tidak boleh negatif.`;
      }
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateProductForm(
  input: ProductFormInput,
  options?: { requireCost?: boolean; isVariantChild?: boolean; requireVariantDrafts?: boolean },
): ProductFormValidationResult {
  const errors: Record<string, string> = {};
  const messages: string[] = [];

  if (!input.sku.trim()) {
    errors.sku = 'SKU wajib diisi.';
  }
  if (!input.name.trim()) {
    errors.name = 'Nama produk wajib diisi.';
  }
  if (!input.unitId) {
    errors.unitId = 'Satuan dasar (stok) wajib dipilih.';
  }

  const isVariantParent =
    input.productType === ProductType.VARIANT && !options?.isVariantChild && input.hasVariants !== false;
  const priceRaw = input.price.trim();

  if (isVariantParent) {
    if (priceRaw) {
      const price = parseCurrencyInput(priceRaw);
      if (!Number.isInteger(price) || price < 0) {
        errors.price = 'Harga induk harus angka bulat rupiah dan tidak boleh negatif.';
      } else if (price > 0) {
        messages.push('Produk induk varian biasanya harga 0 — harga diatur per SKU anak.');
      }
    }
  } else if (!priceRaw) {
    errors.price = 'Harga jual wajib diisi.';
  } else {
    const price = parseCurrencyInput(priceRaw);
    if (!Number.isInteger(price) || price < 0) {
      errors.price = 'Harga jual harus angka bulat rupiah dan tidak boleh negatif.';
    }
  }

  if (options?.requireCost && input.costPrice !== undefined) {
    const costRaw = input.costPrice.trim();
    if (costRaw) {
      const cost = parseCurrencyInput(costRaw);
      if (!Number.isInteger(cost) || cost < 0) {
        errors.costPrice = 'Harga modal harus angka bulat rupiah dan tidak boleh negatif.';
      }
    }
  }

  if (options?.isVariantChild) {
    if (!input.variantLabel?.trim()) {
      errors.variantLabel = 'Label varian wajib diisi.';
    }
    if (!input.parentProductId) {
      errors.parentProductId = 'Produk induk varian wajib dipilih.';
    }
  }

  if (input.productType === ProductType.MULTI_UNIT) {
    const moqStr = input.moq?.trim() || '1';
    const stepStr = input.orderStep?.trim() || '1';
    const moq = parseQuantityInput(moqStr);
    const step = parseQuantityInput(stepStr);
    if (moq <= 0) errors.moq = 'MOQ jual ecer harus lebih dari 0.';
    if (step <= 0) errors.orderStep = 'Kelipatan qty ecer harus lebih dari 0.';

    const conversions = input.unitConversions ?? [];
    const purchaseRow = conversions.find((row) => row.isPurchaseUnit);
    if (!purchaseRow?.unitId) {
      errors.unitConversions = 'Satuan beli ke supplier wajib dipilih.';
    } else if (purchaseRow.conversionToBase <= 0) {
      errors.unitConversions = 'Isi konversi beli: 1 satuan beli = berapa satuan stok.';
    }

    const sellsPurchase = purchaseRow?.isSellUnit === true;
    const sellsOther = conversions.some((row) => row.isSellUnit && row.unitId !== purchaseRow?.unitId);
    if (!sellsPurchase && !sellsOther) {
      // Base-unit ecer sell is always available via moq/orderStep — no extra check needed.
    }

    if (conversions.length > 0) {
      const convResult = validateUnitConversions(input.unitId, conversions);
      if (!convResult.valid) {
        errors.unitConversions = convResult.errors[0] ?? 'Konversi satuan tidak valid.';
        convResult.errors.forEach((msg) => messages.push(msg));
      }
    }
  }

  if (input.productType === ProductType.VARIANT && input.hasVariants === false && !options?.isVariantChild) {
    errors.productType = 'Tipe induk varian harus ditandai memiliki varian.';
  }

  if (isVariantParent && options?.requireVariantDrafts) {
    const draftResult = validateVariantDrafts(input.variantDrafts, {
      requireCost: options.requireCost,
    });
    if (!draftResult.valid) {
      Object.assign(errors, draftResult.errors);
    }
  }

  const valid = Object.keys(errors).length === 0;
  return { valid, errors, messages };
}

/** Check whether form is ready to submit (for disable-save button). */
export function isProductFormSubmittable(
  input: ProductFormInput,
  options?: { requireCost?: boolean; isVariantChild?: boolean; requireVariantDrafts?: boolean },
): boolean {
  return validateProductForm(input, options).valid;
}
