import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import type { AuthJwtPayload } from '../auth/auth.types';
import { InventoryService } from './inventory.service';
import { StockAdjustDirection } from './dto/adjust-stock.dto';

function createUser(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: 'MANAGER',
    outletIds: ['outlet-1'],
  };
}

test('Inventory: listInventory marks low stock items', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    inventoryItem: {
      findMany: async () => [
        {
          id: 'inv-1',
          outletId: 'outlet-1',
          productId: 'prod-1',
          quantity: 3,
          minStock: 5,
          product: {
            id: 'prod-1',
            sku: 'SMN-001',
            name: 'Semen Portland',
            isActive: true,
            hasVariants: false,
            variantLabel: null,
            parentProductId: null,
            categoryId: null,
            category: null,
            parentProduct: null,
            unit: { symbol: 'sak', name: 'Sak' },
            unitConversions: [],
          },
        },
      ],
    },
  };

  const service = new InventoryService(prisma as never);
  const result = await service.listInventory(createUser(), {});

  assert.equal(result.lowStockCount, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.isLowStock, true);
  assert.equal(result.items[0]?.displayName, 'Semen Portland');
});

test('Inventory: listInventory excludes parent variant products', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    inventoryItem: {
      findMany: async () => [
        {
          id: 'inv-parent',
          outletId: 'outlet-1',
          productId: 'prod-parent',
          quantity: 0,
          minStock: 0,
          product: {
            id: 'prod-parent',
            sku: 'CAT-PARENT',
            name: 'Cat Tembok Interior',
            isActive: true,
            hasVariants: true,
            variantLabel: null,
            parentProductId: null,
            categoryId: null,
            category: null,
            parentProduct: null,
            unit: { symbol: 'liter', name: 'Liter' },
            unitConversions: [],
          },
        },
        {
          id: 'inv-child',
          outletId: 'outlet-1',
          productId: 'prod-child',
          quantity: 12,
          minStock: 5,
          product: {
            id: 'prod-child',
            sku: 'CAT-5L',
            name: 'Cat Tembok Interior — 5 Liter',
            isActive: true,
            hasVariants: false,
            variantLabel: '5 Liter',
            parentProductId: 'prod-parent',
            categoryId: null,
            category: null,
            parentProduct: { name: 'Cat Tembok Interior' },
            unit: { symbol: 'liter', name: 'Liter' },
            unitConversions: [],
          },
        },
      ],
    },
  };

  const service = new InventoryService(prisma as never);
  const result = await service.listInventory(createUser(), {});

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.sku, 'CAT-5L');
  assert.equal(result.items[0]?.displayName, 'Cat Tembok Interior — 5 Liter');
  assert.equal(result.totalCount, 1);
});

test('Inventory: opnameStock skips movement when qty unchanged', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    product: {
      findFirst: async () => ({
        id: 'prod-1',
        name: 'Semen',
        sku: 'SMN-001',
        hasVariants: false,
        isActive: true,
      }),
    },
    inventoryItem: {
      findUnique: async () => ({ id: 'inv-1', quantity: 10 }),
    },
    $transaction: async () => {
      throw new Error('$transaction should not run');
    },
  };

  const service = new InventoryService(prisma as never);
  const result = await service.opnameStock(createUser(), {
    productId: 'prod-1',
    actualQuantity: 10,
  });

  assert.equal(result.changed, false);
  assert.equal(result.delta, 0);
});

test('Inventory: adjustStock rejects parent variant product', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    product: {
      findFirst: async () => ({ id: 'prod-parent', name: 'Cat Tembok', sku: 'CAT-PARENT', hasVariants: true }),
    },
    $transaction: async () => {
      throw new Error('$transaction should not run');
    },
  };

  const service = new InventoryService(prisma as never);
  await assert.rejects(
    () =>
      service.adjustStock(createUser(), {
        productId: 'prod-parent',
        direction: StockAdjustDirection.IN,
        quantity: 1,
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Inventory: adjustStock rejects OUT when insufficient stock', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    product: {
      findFirst: async () => ({ id: 'prod-1', name: 'Semen', sku: 'SMN-001', hasVariants: false }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryItem: {
          findUnique: async () => ({ id: 'inv-1', quantity: 2 }),
          update: async () => {
            throw new Error('update should not run');
          },
        },
        stockMovement: { create: async () => ({}) },
      }),
  };

  const service = new InventoryService(prisma as never);
  await assert.rejects(
    () =>
      service.adjustStock(createUser(), {
        productId: 'prod-1',
        direction: StockAdjustDirection.OUT,
        quantity: 5,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      return true;
    },
  );
});

test('Inventory: transferStock moves quantity between outlets atomically', async () => {
  const movements: Array<{ outletId: string; type: string; quantity: unknown }> = [];
  const inventory = new Map<string, number>([
    ['outlet-1:prod-1', 10],
    ['outlet-2:prod-1', 2],
  ]);

  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    product: {
      findFirst: async () => ({
        id: 'prod-1',
        name: 'Semen Portland',
        sku: 'SMN-001',
        hasVariants: false,
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        inventoryItem: {
          findUnique: async ({ where }: { where: { outletId_productId: { outletId: string; productId: string } } }) => {
            const key = `${where.outletId_productId.outletId}:${where.outletId_productId.productId}`;
            const qty = inventory.get(key);
            return qty != null ? { id: key, quantity: qty, outletId: where.outletId_productId.outletId, productId: where.outletId_productId.productId } : null;
          },
          update: async ({ where, data }: { where: { id: string }; data: { quantity: unknown } }) => {
            inventory.set(where.id, Number(data.quantity));
            const [outletId, productId] = where.id.split(':');
            return { id: where.id, quantity: data.quantity, outletId, productId };
          },
          create: async ({ data }: { data: { outletId: string; productId: string; quantity: unknown } }) => {
            const key = `${data.outletId}:${data.productId}`;
            inventory.set(key, Number(data.quantity));
            return { id: key, ...data };
          },
        },
        stockMovement: {
          create: async ({ data }: { data: { outletId: string; type: string; quantity: unknown } }) => {
            movements.push(data);
            return { id: `mov-${movements.length}`, ...data, quantityBefore: 0, quantityAfter: 0 };
          },
        },
      };
      return fn(tx);
    },
  };

  const service = new InventoryService(prisma as never);
  const user = {
    ...createUser(),
    outletIds: ['outlet-1', 'outlet-2'],
  };

  const result = await service.transferStock(user, {
    fromOutletId: 'outlet-1',
    toOutletId: 'outlet-2',
    productId: 'prod-1',
    quantity: 3,
  });

  assert.equal(result.quantity, 3);
  assert.equal(inventory.get('outlet-1:prod-1'), 7);
  assert.equal(inventory.get('outlet-2:prod-1'), 5);
  assert.equal(movements.length, 2);
  assert.equal(movements[0]?.type, 'TRANSFER_OUT');
  assert.equal(movements[1]?.type, 'TRANSFER_IN');
});
