import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertFromBaseQuantity,
  convertToBaseQuantity,
  isValidSellQuantity,
  roundQty,
} from './unit-conversion';

const baseUnitId = 'unit-kg';
const conversions = [
  {
    unitId: 'unit-dus',
    conversionToBase: 25,
    isPurchaseUnit: true,
    isSellUnit: false,
  },
  {
    unitId: 'unit-kg',
    conversionToBase: 1,
    isPurchaseUnit: false,
    isSellUnit: true,
    sellStep: 0.5,
    minQty: 0.5,
  },
];

const sengBaseUnitId = 'unit-m';
const sengConversions = [
  {
    unitId: 'unit-roll',
    conversionToBase: 50,
    isPurchaseUnit: true,
    isSellUnit: true,
    sellStep: 1,
    minQty: 1,
  },
];

test('UnitConversion: receive 2 dus = +50 kg base stock', () => {
  const baseQty = convertToBaseQuantity(2, 'unit-dus', baseUnitId, conversions);
  assert.equal(baseQty, 50);
});

test('UnitConversion: sell 1.5 kg deducts 1.5 kg base stock', () => {
  const baseQty = convertToBaseQuantity(1.5, baseUnitId, baseUnitId, conversions);
  assert.equal(baseQty, 1.5);
});

test('UnitConversion: 250 kg equals 10 dus purchase equivalent', () => {
  const dusQty = convertFromBaseQuantity(250, 25);
  assert.equal(dusQty, 10);
});

test('UnitConversion: validates fractional kg sell step 0.5', () => {
  assert.equal(isValidSellQuantity(1.5, baseUnitId, baseUnitId, 0.5, 0.5, conversions), true);
  assert.equal(isValidSellQuantity(1.3, baseUnitId, baseUnitId, 0.5, 0.5, conversions), false);
});

test('UnitConversion: roundQty keeps 3 decimal precision', () => {
  assert.equal(roundQty(2.5555), 2.556);
});

test('UnitConversion: seng receive 2 roll = +100 m base stock', () => {
  const baseQty = convertToBaseQuantity(2, 'unit-roll', sengBaseUnitId, sengConversions);
  assert.equal(baseQty, 100);
});

test('UnitConversion: seng sell 12.5 m deducts 12.5 m base stock', () => {
  const baseQty = convertToBaseQuantity(12.5, sengBaseUnitId, sengBaseUnitId, sengConversions);
  assert.equal(baseQty, 12.5);
});

test('UnitConversion: seng sell 1 roll deducts 50 m base stock', () => {
  const baseQty = convertToBaseQuantity(1, 'unit-roll', sengBaseUnitId, sengConversions);
  assert.equal(baseQty, 50);
});

test('UnitConversion: seng stock chain 100m - 12.5m - 50m = 37.5m', () => {
  let stock = convertToBaseQuantity(2, 'unit-roll', sengBaseUnitId, sengConversions);
  stock = roundQty(stock - convertToBaseQuantity(12.5, sengBaseUnitId, sengBaseUnitId, sengConversions));
  stock = roundQty(stock - convertToBaseQuantity(1, 'unit-roll', sengBaseUnitId, sengConversions));
  assert.equal(stock, 37.5);
});

test('UnitConversion: seng validates fractional meter sell step 0.5', () => {
  assert.equal(
    isValidSellQuantity(12.5, sengBaseUnitId, sengBaseUnitId, 0.5, 0.5, sengConversions),
    true,
  );
  assert.equal(
    isValidSellQuantity(12.3, sengBaseUnitId, sengBaseUnitId, 0.5, 0.5, sengConversions),
    false,
  );
});
