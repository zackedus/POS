import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePosTax } from './tax-calculator';

test('computePosTax returns zero tax when PPN disabled', () => {
  const result = computePosTax({
    subtotal: 100_000,
    discount: 10_000,
    ppnEnabled: false,
    ppnRatePercent: 11,
  });
  assert.equal(result.tax, 0);
  assert.equal(result.total, 90_000);
});

test('computePosTax applies exclusive PPN on net subtotal after discount', () => {
  const result = computePosTax({
    subtotal: 100_000,
    discount: 10_000,
    ppnEnabled: true,
    ppnRatePercent: 11,
  });
  assert.equal(result.taxableBase, 90_000);
  assert.equal(result.tax, 9_900);
  assert.equal(result.total, 99_900);
});

test('computePosTax clamps taxable base at zero when discount exceeds subtotal', () => {
  const result = computePosTax({
    subtotal: 50_000,
    discount: 60_000,
    ppnEnabled: true,
    ppnRatePercent: 11,
  });
  assert.equal(result.taxableBase, 0);
  assert.equal(result.tax, 0);
  assert.equal(result.total, 0);
});
