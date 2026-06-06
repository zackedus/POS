import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PromoApplyTo, PromoType, UserRole } from '@barokah/database';
import { PromoService } from './promo.service';

const owner = {
  sub: 'u1',
  email: 'o@test.com',
  tenantId: 'tenant-1',
  role: UserRole.OWNER,
  outletIds: ['outlet-1'],
};

test('PromoService: list returns tenant promos', async () => {
  const prisma = {
    promoRule: {
      findMany: async () => [
        {
          id: 'p1',
          name: 'Diskon 10%',
          type: PromoType.PERCENTAGE,
          value: { toString: () => '10' },
          applyTo: PromoApplyTo.ALL,
          categoryId: null,
          productId: null,
          minPurchase: null,
          isActive: true,
          startsAt: null,
          endsAt: null,
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-01'),
          category: null,
          product: null,
        },
      ],
    },
  };
  const service = new PromoService(prisma as never);
  const result = await service.list(owner);
  assert.equal(result.promos.length, 1);
  assert.equal(result.promos[0]?.name, 'Diskon 10%');
});

test('PromoService: validateWithItems applies percentage discount', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        { id: 'p1', categoryId: 'cat-1', price: { toString: () => '100000' } },
      ],
    },
    promoRule: {
      findMany: async () => [
        {
          id: 'promo-1',
          name: 'Diskon 10%',
          type: PromoType.PERCENTAGE,
          value: { toString: () => '10' },
          applyTo: PromoApplyTo.ALL,
          categoryId: null,
          productId: null,
          minPurchase: null,
          isActive: true,
          startsAt: null,
          endsAt: null,
        },
      ],
    },
  };
  const service = new PromoService(prisma as never);
  const result = await service.validateWithItems(owner, undefined, [{ productId: 'p1', quantity: 2 }]);
  assert.equal(result.applicable, true);
  assert.equal(result.discountAmount, 20_000);
});

test('PromoService: create percentage promo', async () => {
  let created: unknown;
  const prisma = {
    promoRule: {
      create: async (args: unknown) => {
        created = args;
        return {
          id: 'p-new',
          name: 'Promo Juni',
          type: PromoType.PERCENTAGE,
          value: { toString: () => '15' },
          applyTo: PromoApplyTo.ALL,
          categoryId: null,
          productId: null,
          minPurchase: null,
          isActive: true,
          startsAt: null,
          endsAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          product: null,
        };
      },
    },
  };
  const service = new PromoService(prisma as never);
  const row = await service.create(owner, {
    name: 'Promo Juni',
    type: PromoType.PERCENTAGE,
    value: 15,
  });
  assert.equal(row.value, 15);
  assert.ok(created);
});
