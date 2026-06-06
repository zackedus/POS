import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePromoDiscount,
  isPromoActive,
  pickBestPromo,
  type PromoCartLine,
  type PromoRuleInput,
} from './promo-calculator';

const lines: PromoCartLine[] = [
  { productId: 'p1', categoryId: 'cat-a', lineSubtotal: 100_000 },
  { productId: 'p2', categoryId: 'cat-b', lineSubtotal: 50_000 },
];

const baseRule = (overrides: Partial<PromoRuleInput>): PromoRuleInput => ({
  id: 'promo-1',
  name: 'Test Promo',
  type: 'PERCENTAGE',
  value: 10,
  applyTo: 'ALL',
  categoryId: null,
  productId: null,
  minPurchase: null,
  isActive: true,
  startsAt: null,
  endsAt: null,
  ...overrides,
});

test('promo-calculator: percentage all products', () => {
  const result = calculatePromoDiscount(baseRule({ value: 10 }), lines);
  assert.ok(result);
  assert.equal(result.discountAmount, 15_000);
  assert.equal(result.subtotalAfter, 135_000);
});

test('promo-calculator: fixed amount capped at applicable subtotal', () => {
  const result = calculatePromoDiscount(
    baseRule({ type: 'FIXED_AMOUNT', value: 200_000, applyTo: 'CATEGORY', categoryId: 'cat-a' }),
    lines,
  );
  assert.ok(result);
  assert.equal(result.discountAmount, 100_000);
});

test('promo-calculator: min purchase blocks promo', () => {
  const result = calculatePromoDiscount(baseRule({ minPurchase: 200_000 }), lines);
  assert.equal(result, null);
});

test('promo-calculator: inactive promo rejected', () => {
  assert.equal(isPromoActive(baseRule({ isActive: false })), false);
});

test('promo-calculator: product-targeted promo ignores other lines', () => {
  const result = calculatePromoDiscount(
    baseRule({ type: 'FIXED_AMOUNT', value: 25_000, applyTo: 'PRODUCT', productId: 'p2' }),
    lines,
  );
  assert.ok(result);
  assert.equal(result.discountAmount, 25_000);
});

test('promo-calculator: pickBestPromo chooses highest discount', () => {
  const rules = [
    baseRule({ id: 'a', value: 5 }),
    baseRule({ id: 'b', value: 12 }),
    baseRule({ id: 'c', type: 'FIXED_AMOUNT', value: 10_000 }),
  ];
  const best = pickBestPromo(rules, lines);
  assert.ok(best);
  assert.equal(best.promoRuleId, 'b');
  assert.equal(best.discountAmount, 18_000);
});
