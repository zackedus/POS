import { describe, expect, it } from 'vitest';
import { normalizeGridResponse } from './catalog-api';

describe('catalog-api', () => {
  it('normalizes legacy array grid response', () => {
    const products = [{ id: 'p-1', name: 'Semen', sku: 'SMN-001', price: 70000 }];
    expect(normalizeGridResponse(products)).toEqual({
      items: products,
      total: 1,
    });
  });

  it('normalizes meta grid response', () => {
    const payload = {
      items: [{ id: 'p-2', name: 'Cat', sku: 'CAT-001', price: 50000 }],
      total: 42,
    };
    expect(normalizeGridResponse(payload)).toEqual(payload);
  });
});
