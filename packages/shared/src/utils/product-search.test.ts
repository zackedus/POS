import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesProductSearch,
  normalizeProductSearchText,
  tokenizeProductSearchQuery,
} from './product-search';

test('normalizeProductSearchText strips separators', () => {
  assert.equal(normalizeProductSearchText('Cat-5L'), 'cat5l');
  assert.equal(normalizeProductSearchText('  SKU 001 '), 'sku001');
});

test('tokenizeProductSearchQuery splits multi-word queries', () => {
  assert.deepEqual(tokenizeProductSearchQuery('cat 5l'), ['cat', '5l']);
});

test('matchesProductSearch finds partial normalized match', () => {
  assert.equal(
    matchesProductSearch({ name: 'Cat Tembok Interior 5 Liter', sku: 'CAT-5L', variantLabel: null }, 'cat 5l'),
    true,
  );
  assert.equal(
    matchesProductSearch({ name: 'Semen 40kg', sku: 'SMN-40', variantLabel: null, barcode: '8991234567890' }, '8991234'),
    true,
  );
  assert.equal(
    matchesProductSearch({ name: 'Semen 40kg', sku: 'SMN-40', variantLabel: null }, 'paku'),
    false,
  );
});
