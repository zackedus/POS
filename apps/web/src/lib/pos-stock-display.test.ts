import { describe, expect, it } from 'vitest';
import {
  formatCartAvailableLabel,
  formatProductStockBadge,
  isOutOfStock,
} from './pos-stock-display';

describe('pos-stock-display', () => {
  it('formats simple product stock badge in Indonesian number format', () => {
    expect(
      formatProductStockBadge({
        stockQty: 45,
        baseUnitSymbol: 'pcs',
      }),
    ).toEqual({
      text: 'Stok: 45 pcs',
      isOutOfStock: false,
      hint: undefined,
    });
  });

  it('formats paku stock in kg', () => {
    expect(
      formatProductStockBadge({
        stockQty: 197.5,
        baseUnitSymbol: 'kg',
      }),
    ).toEqual({
      text: 'Stok: 197,5 kg',
      isOutOfStock: false,
      hint: undefined,
    });
  });

  it('formats seng stock with roll hint', () => {
    expect(
      formatProductStockBadge({
        stockQty: 87.5,
        baseUnitSymbol: 'm',
        sellUnits: [
          { id: 'unit-m', symbol: 'm', conversionToBase: 1 },
          { id: 'unit-roll', symbol: 'roll', conversionToBase: 50, isDefault: true },
        ],
      }),
    ).toEqual({
      text: 'Stok: 87,5 m',
      isOutOfStock: false,
      hint: '≈ 1,75 roll',
    });
  });

  it('marks empty stock as habis', () => {
    expect(isOutOfStock(0)).toBe(true);
    expect(formatProductStockBadge({ stockQty: 0, baseUnitSymbol: 'sak' })).toEqual({
      text: 'Habis',
      isOutOfStock: true,
      hint: 'Stok: 0 (habis)',
    });
  });

  it('formats cart available label for multi-unit line', () => {
    expect(
      formatCartAvailableLabel({
        stockQty: 40,
        baseUnitSymbol: 'm',
        sellUnitId: 'unit-roll',
        sellUnitSymbol: 'roll',
        unitConversions: [{ unitId: 'unit-roll', conversionToBase: 50, isPurchaseUnit: true, isSellUnit: true }],
      }),
    ).toBe('Tersedia: 40 m (0,8 roll)');
  });
});
