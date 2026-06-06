import { describe, expect, it } from 'vitest';
import { calculateOrderTotals, calculateSubtotal } from './pricing';

describe('store pricing', () => {
  it('calculates subtotal from cart lines', () => {
    const subtotal = calculateSubtotal([
      { productId: 'a', name: 'A', sku: 'A', unitSymbol: 'sak', price: 65000, quantity: 2 },
      { productId: 'b', name: 'B', sku: 'B', unitSymbol: 'pail', price: 89000, quantity: 1 },
    ]);
    expect(subtotal).toBe(219000);
  });

  it('applies PPN 11% to subtotal', () => {
    const totals = calculateOrderTotals(219000);
    expect(totals.tax).toBe(24090);
    expect(totals.total).toBe(243090);
  });

  it('includes flat shipping fee for delivery totals', () => {
    const totals = calculateOrderTotals(219000, 25000);
    expect(totals.shippingFee).toBe(25000);
    expect(totals.total).toBe(268090);
  });
});
