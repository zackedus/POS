import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEmptyStockMessage,
  formatInsufficientStockMessage,
  formatAvailableStockLabel,
  formatRequestedStockLabel,
} from './stock-messages';

test('stock-messages: formats empty stock message', () => {
  assert.equal(
    formatEmptyStockMessage('Semen Portland'),
    'Stok Semen Portland habis. Tidak bisa ditambahkan ke keranjang.',
  );
});

test('stock-messages: formats insufficient stock in base unit', () => {
  assert.equal(
    formatInsufficientStockMessage({
      productName: 'Paku 2"',
      availableBaseQty: 12.5,
      requestedBaseQty: 20,
      baseUnitSymbol: 'kg',
    }),
    'Stok tidak cukup untuk Paku 2". Tersedia: 12,5 kg, diminta: 20 kg.',
  );
});

test('stock-messages: formats multi-unit roll stock summary', () => {
  assert.equal(
    formatAvailableStockLabel({
      availableBaseQty: 40,
      baseUnitSymbol: 'm',
      sellUnitSymbol: 'roll',
      conversionToBase: 50,
    }),
    '40 m (0,8 roll)',
  );

  assert.equal(
    formatRequestedStockLabel({
      requestedBaseQty: 50,
      baseUnitSymbol: 'm',
      sellQty: 1,
      sellUnitSymbol: 'roll',
    }),
    '1 roll (50 m)',
  );

  assert.equal(
    formatInsufficientStockMessage({
      productName: 'Seng Galvalum',
      availableBaseQty: 40,
      requestedBaseQty: 50,
      baseUnitSymbol: 'm',
      sellQty: 1,
      sellUnitSymbol: 'roll',
      conversionToBase: 50,
    }),
    'Stok tidak cukup. Tersedia: 40 m (0,8 roll), diminta: 1 roll (50 m).',
  );
});
