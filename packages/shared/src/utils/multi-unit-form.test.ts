import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUnitConversionsFromMultiUnit,
  parseMultiUnitConfig,
  suggestPurchaseConversionToBase,
  suggestPurchaseUnitSymbol,
} from './multi-unit-form';
import { suggestBaseUnitSymbol } from './product-type';

test('MultiUnitForm: seng category suggests meter base and roll purchase unit', () => {
  assert.equal(suggestBaseUnitSymbol('Atap & Seng'), 'm');
  assert.equal(suggestPurchaseUnitSymbol('Seng Galvalum'), 'roll');
  assert.equal(suggestPurchaseConversionToBase('Atap Galvalum'), 50);
});

test('MultiUnitForm: paku category keeps dus purchase defaults', () => {
  assert.equal(suggestBaseUnitSymbol('Besi & Baja'), 'kg');
  assert.equal(suggestPurchaseUnitSymbol('Paku 2 inch'), 'dus');
  assert.equal(suggestPurchaseConversionToBase('Paku'), 20);
});

test('MultiUnitForm: build seng roll conversion row with optional sell', () => {
  const rows = buildUnitConversionsFromMultiUnit({
    purchaseUnitId: 'unit-roll',
    purchaseConversionToBase: 50,
    sellInPurchaseUnit: true,
  });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    unitId: 'unit-roll',
    conversionToBase: 50,
    isPurchaseUnit: true,
    isSellUnit: true,
    sellStep: 1,
    minQty: 1,
  });
});

test('MultiUnitForm: parseMultiUnitConfig reads seng roll setup', () => {
  const config = parseMultiUnitConfig([
    {
      unitId: 'unit-roll',
      conversionToBase: 50,
      isPurchaseUnit: true,
      isSellUnit: true,
    },
  ]);
  assert.deepEqual(config, {
    purchaseUnitId: 'unit-roll',
    purchaseConversionToBase: 50,
    sellInPurchaseUnit: true,
  });
});
