import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatCurrencyAmountOnly,
  formatCurrencyIDR,
  parseCurrency,
  parseCurrencyInput,
} from './format-currency';

test('formatCurrencyIDR formats Indonesian rupiah', () => {
  assert.equal(formatCurrencyIDR(0), 'Rp 0');
  assert.equal(formatCurrencyIDR(1000), 'Rp 1.000');
  assert.equal(formatCurrencyIDR(1_000_000), 'Rp 1.000.000');
  assert.equal(formatCurrency(75000), 'Rp 75.000');
});

test('formatCurrencyAmountOnly omits prefix', () => {
  assert.equal(formatCurrencyAmountOnly(1_500_000), '1.500.000');
});

test('parseCurrencyInput accepts Indonesian and plain formats', () => {
  assert.equal(parseCurrencyInput(''), 0);
  assert.equal(parseCurrencyInput('1000000'), 1_000_000);
  assert.equal(parseCurrencyInput('1.000.000'), 1_000_000);
  assert.equal(parseCurrencyInput('Rp 1.000.000'), 1_000_000);
  assert.equal(parseCurrencyInput('Rp1.000.000'), 1_000_000);
  assert.equal(parseCurrencyInput('1.500,50'), 1501);
  assert.equal(parseCurrency('75.000'), 75_000);
});
