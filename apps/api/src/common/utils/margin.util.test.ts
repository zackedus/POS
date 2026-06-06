import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNegativeMarginWarning,
  computeBundleEffectiveCost,
  detectNegativeMargin,
  NEGATIVE_MARGIN_MESSAGE,
} from './margin.util';

test('Margin: detectNegativeMargin returns warning when sell below cost', () => {
  const warning = detectNegativeMargin({
    productId: 'p-1',
    productName: 'Semen',
    sellPrice: 70000,
    costPrice: 75000,
  });
  assert.ok(warning);
  assert.equal(warning?.productId, 'p-1');
  assert.match(warning?.message ?? '', new RegExp(NEGATIVE_MARGIN_MESSAGE));
});

test('Margin: detectNegativeMargin ignores zero cost', () => {
  const warning = detectNegativeMargin({
    productId: 'p-1',
    productName: 'Semen',
    sellPrice: 1000,
    costPrice: 0,
  });
  assert.equal(warning, null);
});

test('Margin: computeBundleEffectiveCost prefers bundle header cost', () => {
  const cost = computeBundleEffectiveCost(300000, [{ costPrice: 50000, quantity: 2 }]);
  assert.equal(cost, 300000);
});

test('Margin: computeBundleEffectiveCost rolls up components when header cost zero', () => {
  const cost = computeBundleEffectiveCost(0, [
    { costPrice: 70000, quantity: 2 },
    { costPrice: 54000, quantity: 1 },
  ]);
  assert.equal(cost, 194000);
});

test('Margin: buildNegativeMarginWarning includes product name', () => {
  assert.match(buildNegativeMarginWarning('Pipa PVC'), /Pipa PVC/);
});
