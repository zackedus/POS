import { describe, expect, it } from 'vitest';
import { mapRecallItemsToCart } from './recall-cart';

describe('mapRecallItemsToCart', () => {
  const sengCatalog = {
    id: 'prod-seng',
    moq: 0.5,
    orderStep: 0.5,
    unit: { id: 'unit-m', symbol: 'm', name: 'Meter' },
    sellUnits: [
      {
        id: 'unit-roll',
        symbol: 'roll',
        name: 'Roll',
        price: 2_250_000,
        sellStep: 1,
        minQty: 1,
        conversionToBase: 50,
      },
    ],
  };

  it('restores roll sell unit and price from recall payload', () => {
    const cart = mapRecallItemsToCart(
      [
        {
          productId: 'prod-seng',
          name: 'Seng Galvalum',
          price: 2_250_000,
          quantity: 1,
          sellUnitId: 'unit-roll',
          unitSymbol: 'roll',
        },
      ],
      [sengCatalog],
    );

    expect(cart).toHaveLength(1);
    expect(cart[0]?.sellUnitId).toBe('unit-roll');
    expect(cart[0]?.price).toBe(2_250_000);
    expect(cart[0]?.unitSymbol).toBe('roll');
    expect(cart[0]?.orderStep).toBe(1);
    expect(cart[0]?.sellUnits).toHaveLength(1);
  });

  it('falls back to base unit metadata when sellUnitId absent', () => {
    const cart = mapRecallItemsToCart(
      [
        {
          productId: 'prod-seng',
          name: 'Seng Galvalum',
          price: 45_000,
          quantity: 2.5,
        },
      ],
      [sengCatalog],
    );

    expect(cart[0]?.sellUnitId).toBeUndefined();
    expect(cart[0]?.unitSymbol).toBe('m');
    expect(cart[0]?.orderStep).toBe(0.5);
  });
});
