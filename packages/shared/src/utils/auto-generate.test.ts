import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveNamePrefix,
  generateBundleSku,
  generateCodeFromName,
  generateExpenseRef,
  generateProductSku,
  generateSupplierCode,
  generateVariantSku,
  nextExpenseSequence,
  randomAlphanumeric,
  slugifyCode,
} from './auto-generate';

const fixedRandom = () => 0.42;

test('slugifyCode normalizes Indonesian product names', () => {
  assert.equal(slugifyCode('Semen Portland 40kg'), 'SEMEN-PORTLAND-40KG');
  assert.equal(slugifyCode('  Cat & Kayu  '), 'CAT-KAYU');
});

test('deriveNamePrefix uses initials for multi-word names', () => {
  assert.equal(deriveNamePrefix('Semen & Mortar'), 'SM');
  assert.equal(deriveNamePrefix('Paku'), 'PAKU');
});

test('generateProductSku prefers category prefix and name slug', () => {
  const sku = generateProductSku({
    name: 'Semen Portland 40kg',
    categoryName: 'Semen & Mortar',
    randomSuffix: 'ABCD',
    timestamp: 1_700_000_000_000,
  });
  assert.equal(sku, 'SM-SEMEN-PORTLAND-4-ABCD');
});

test('generateProductSku falls back to timestamp when name empty', () => {
  const sku = generateProductSku({
    randomSuffix: 'WXYZ',
    timestamp: 1_700_000_000_000,
  });
  assert.match(sku, /^PRD-[A-Z0-9]+-WXYZ$/);
});

test('generateVariantSku uses label slug then V-sequence', () => {
  assert.equal(generateVariantSku('CAT-PAINT', '25 Liter'), 'CAT-PAINT-25-LITER');
  assert.equal(
    generateVariantSku('CAT-PAINT', '25 Liter', { existingSkus: ['CAT-PAINT-25-LITER'] }),
    'CAT-PAINT-V01',
  );
  assert.equal(
    generateVariantSku('CAT-PAINT', '25 Liter', {
      existingSkus: ['CAT-PAINT-25-LITER', 'CAT-PAINT-V01'],
    }),
    'CAT-PAINT-V02',
  );
});

test('generateCodeFromName and supplier/bundle helpers', () => {
  assert.equal(generateCodeFromName('Bahan Bangunan'), 'BAHAN-BANGUN');
  assert.match(generateSupplierCode('Toko Maju Jaya', fixedRandom), /^SUP-TOKO-MAJU-[A-Z0-9]{3}$/);
  assert.match(generateBundleSku('Paket Semen', fixedRandom), /^BND-PAKET-SEMEN-[A-Z0-9]{3}$/);
});

test('generateExpenseRef and nextExpenseSequence', () => {
  const date = new Date('2026-06-06T10:00:00.000Z');
  assert.equal(generateExpenseRef({ date, sequence: 3 }), 'EXP-20260606-0003');
  assert.equal(
    nextExpenseSequence(['EXP-20260606-0001', 'EXP-20260606-0007', 'EXP-20260605-0099'], date),
    8,
  );
});

test('randomAlphanumeric is deterministic with injected random', () => {
  assert.equal(randomAlphanumeric(4, fixedRandom), 'PPPP');
});
