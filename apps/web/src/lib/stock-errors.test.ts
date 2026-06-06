import { describe, expect, it } from 'vitest';
import { evaluateAddToCartStock, resolveStockErrorMessage } from './stock-errors';

describe('stock-errors', () => {
  it('parses structured insufficient stock API error', () => {
    const message = resolveStockErrorMessage({
      code: 'INSUFFICIENT_STOCK',
      message: 'fallback',
      details: [
        {
          field: 'items',
          message: 'detail message',
          value: {
            productName: 'Paku 2"',
            availableBaseQty: 12.5,
            requestedBaseQty: 20,
            baseUnitSymbol: 'kg',
          },
        },
      ],
    });

    expect(message).toBe('Stok tidak cukup untuk Paku 2". Tersedia: 12,5 kg, diminta: 20 kg.');
  });

  it('blocks add-to-cart when stock is empty', () => {
    const result = evaluateAddToCartStock({
      productId: 'prod-1',
      productName: 'Semen Portland',
      stockQty: 0,
      baseUnitId: 'unit-sak',
      baseUnitSymbol: 'sak',
      lineQty: 1,
      cart: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe('Stok Semen Portland habis. Tidak bisa ditambahkan ke keranjang.');
    }
  });

  it('blocks add-to-cart when requested qty exceeds stock', () => {
    const result = evaluateAddToCartStock({
      productId: 'prod-seng',
      productName: 'Seng Galvalum',
      stockQty: 40,
      baseUnitId: 'unit-m',
      baseUnitSymbol: 'm',
      lineQty: 1,
      sellUnitId: 'unit-roll',
      sellUnitSymbol: 'roll',
      unitConversions: [{ unitId: 'unit-roll', conversionToBase: 50, isPurchaseUnit: true, isSellUnit: true }],
      cart: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('40 m (0,8 roll)');
      expect(result.message).toContain('1 roll (50 m)');
    }
  });
});
