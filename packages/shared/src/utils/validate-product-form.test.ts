import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductType } from '../types/product-types';
import {
  inferProductType,
  suggestOrderStep,
  validateUnitConversions,
  formatConversionPreview,
} from './product-type';
import {
  validateProductForm,
  isProductFormSubmittable,
  validateVariantDrafts,
  createEmptyVariantDraft,
} from './validate-product-form';

test('inferProductType: hasVariants → VARIANT', () => {
  assert.equal(inferProductType({ hasVariants: true }), ProductType.VARIANT);
});

test('inferProductType: parentProductId → VARIANT', () => {
  assert.equal(inferProductType({ parentProductId: 'parent-1' }), ProductType.VARIANT);
});

test('inferProductType: unit conversions → MULTI_UNIT', () => {
  assert.equal(inferProductType({ unitConversionCount: 2 }), ProductType.MULTI_UNIT);
});

test('inferProductType: default → SIMPLE', () => {
  assert.equal(inferProductType({}), ProductType.SIMPLE);
});

test('validateUnitConversions: rejects duplicate units', () => {
  const result = validateUnitConversions('base-kg', [
    { unitId: 'dus', conversionToBase: 20, isPurchaseUnit: true, isSellUnit: true },
    { unitId: 'dus', conversionToBase: 20, isPurchaseUnit: false, isSellUnit: true },
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('duplikat')));
});

test('validateUnitConversions: allows purchase+sell on same unit row (paku dus)', () => {
  const result = validateUnitConversions('base-kg', [
    { unitId: 'dus', conversionToBase: 20, isPurchaseUnit: true, isSellUnit: true },
  ]);
  assert.equal(result.valid, true);
});

test('validateUnitConversions: purchase unit must differ from base', () => {
  const result = validateUnitConversions('base-kg', [
    { unitId: 'base-kg', conversionToBase: 25, isPurchaseUnit: true, isSellUnit: false },
  ]);
  assert.equal(result.valid, false);
});

test('validateUnitConversions: valid paku dus→kg setup', () => {
  const result = validateUnitConversions('base-kg', [
    { unitId: 'dus', conversionToBase: 20, isPurchaseUnit: true, isSellUnit: true },
  ]);
  assert.equal(result.valid, true);
});

test('validateProductForm: SIMPLE requires sku, name, price, unit', () => {
  const result = validateProductForm({
    sku: '',
    name: '',
    price: '',
    unitId: '',
    productType: ProductType.SIMPLE,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.sku);
  assert.ok(result.errors.name);
});

test('validateProductForm: valid SIMPLE product', () => {
  const input = {
    sku: 'SMN-001',
    name: 'Semen',
    price: '75000',
    unitId: 'unit-sak',
    productType: ProductType.SIMPLE,
  };
  assert.equal(validateProductForm(input).valid, true);
  assert.equal(isProductFormSubmittable(input), true);
});

test('suggestOrderStep: kg → 0.5', () => {
  assert.equal(suggestOrderStep('kg'), 0.5);
  assert.equal(suggestOrderStep('pcs'), 1);
});

test('formatConversionPreview: 10 dus = 200 kg', () => {
  assert.equal(formatConversionPreview(10, 'dus', 20, 'kg'), 'Beli: 10 dus → +200 kg stok');
});

test('validateProductForm: VARIANT parent does not require parent price', () => {
  const result = validateProductForm({
    sku: 'CAT-PARENT',
    name: 'Cat Tembok',
    price: '',
    unitId: 'unit-liter',
    productType: ProductType.VARIANT,
    hasVariants: true,
    variantDrafts: [
      { ...createEmptyVariantDraft(), variantLabel: '5 Liter', sku: 'CAT-5L', price: '85000' },
    ],
  }, { requireVariantDrafts: true });
  assert.equal(result.valid, true);
});

test('validateProductForm: VARIANT parent requires at least one variant draft', () => {
  const result = validateProductForm({
    sku: 'CAT-PARENT',
    name: 'Cat Tembok',
    price: '0',
    unitId: 'unit-liter',
    productType: ProductType.VARIANT,
    hasVariants: true,
    variantDrafts: [],
  }, { requireVariantDrafts: true });
  assert.equal(result.valid, false);
  assert.ok(result.errors.variantDrafts);
});

test('validateVariantDrafts: rejects duplicate SKU', () => {
  const result = validateVariantDrafts([
    { ...createEmptyVariantDraft(), variantLabel: '5 Liter', sku: 'CAT-5L', price: '85000' },
    { ...createEmptyVariantDraft(), variantLabel: '25 Liter', sku: 'CAT-5L', price: '350000' },
  ]);
  assert.equal(result.valid, false);
  assert.ok(Object.values(result.errors).some((msg) => msg.includes('duplikat')));
});

test('validateVariantDrafts: accepts Cat 5L and 25L with different prices', () => {
  const result = validateVariantDrafts([
    { ...createEmptyVariantDraft(), variantLabel: '5 Liter', sku: 'CAT-5L', price: '85000', costPrice: '72000' },
    { ...createEmptyVariantDraft(), variantLabel: '25 Liter', sku: 'CAT-25L', price: '350000', costPrice: '310000' },
  ], { requireCost: true });
  assert.equal(result.valid, true);
});
