import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deriveBaseCostFromPurchaseCost,
  derivePackageSellPrice,
  derivePurchaseCostFromBaseCost,
  formatMultiUnitPricingPreview,
  resolveSellUnitPrice,
} from './product-pricing';

test('derivePackageSellPrice: paku 18.000/kg × 20 = 360.000/dus', () => {
  assert.equal(derivePackageSellPrice(18000, 20), 360000);
});

test('deriveBaseCostFromPurchaseCost: dus 300.000 / 20 = 15.000/kg', () => {
  assert.equal(deriveBaseCostFromPurchaseCost(300000, 20), 15000);
});

test('derivePurchaseCostFromBaseCost: 15.000/kg × 20 = 300.000/dus', () => {
  assert.equal(derivePurchaseCostFromBaseCost(15000, 20), 300000);
});

test('resolveSellUnitPrice: sell 1 roll at 45.000/m base', () => {
  assert.equal(resolveSellUnitPrice(45000, 1, 'unit-roll', 'unit-m', 50), 2250000);
});

test('resolveSellUnitPrice: sell 2.5 m stays base price', () => {
  assert.equal(resolveSellUnitPrice(45000, 2.5, 'unit-m', 'unit-m', 50), 45000);
});

test('formatMultiUnitPricingPreview: paku example', () => {
  const preview = formatMultiUnitPricingPreview({
    purchaseSymbol: 'dus',
    baseSymbol: 'kg',
    conversionToBase: 20,
    baseSellPrice: 18000,
    baseCostPrice: 15000,
  });
  assert.match(preview ?? '', /1 dus \(20 kg\) = Rp 360\.000 jual \/ Rp 300\.000 beli/);
});
