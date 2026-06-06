import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';
import type { AuthJwtPayload } from '../auth/auth.types';
import { SuppliersService } from './suppliers.service';

function createUser(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: 'MANAGER',
    outletIds: ['outlet-1'],
  };
}

test('Suppliers: receivePurchase converts 2 dus to 50 kg base stock', async () => {
  let movementQty: Decimal | null = null;
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    supplier: { findFirst: async () => ({ id: 'sup-1', name: 'PT Paku Jaya' }) },
    product: {
      findMany: async () => [
        {
          id: 'prod-paku',
          sku: 'PKU-2IN',
          name: 'Paku 2"',
          unitId: 'unit-kg',
          unit: { id: 'unit-kg', symbol: 'kg', name: 'Kilogram' },
          unitConversions: [
            {
              sellUnitId: 'unit-dus',
              conversionToBase: new Decimal(25),
              isPurchaseUnit: true,
              isSellUnit: false,
              sellStep: null,
              minQty: null,
              sellUnit: { id: 'unit-dus', symbol: 'dus', name: 'Dus' },
            },
          ],
        },
      ],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryItem: {
          findUnique: async () => null,
          create: async (args: { data: { quantity: Decimal } }) => ({
            id: 'inv-1',
            ...args.data,
          }),
        },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal } }) => {
            movementQty = args.data.quantity;
            return { id: 'mov-1', ...args.data, quantityBefore: new Decimal(0), quantityAfter: args.data.quantity };
          },
        },
      }),
  };

  const service = new SuppliersService(prisma as never);
  const result = await service.receivePurchase(createUser(), {
    supplierId: 'sup-1',
    items: [{ productId: 'prod-paku', quantity: 2, unitId: 'unit-dus' }],
  });

  assert.equal(Number(movementQty), 50);
  assert.equal(result.items[0]?.baseQuantityAdded, 50);
  assert.equal(result.items[0]?.quantity, 2);
});

test('Suppliers: receivePurchase converts 2 roll to 100 m base stock', async () => {
  let movementQty: import('@prisma/client/runtime/library').Decimal | null = null;
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    supplier: { findFirst: async () => ({ id: 'sup-2', name: 'PT Seng Jaya' }) },
    product: {
      findMany: async () => [
        {
          id: 'prod-seng',
          sku: 'SNG-GAL',
          name: 'Seng Galvalum',
          unitId: 'unit-m',
          unit: { id: 'unit-m', symbol: 'm', name: 'Meter' },
          unitConversions: [
            {
              sellUnitId: 'unit-roll',
              conversionToBase: new Decimal(50),
              isPurchaseUnit: true,
              isSellUnit: true,
              sellStep: null,
              minQty: null,
              sellUnit: { id: 'unit-roll', symbol: 'roll', name: 'Roll' },
            },
          ],
        },
      ],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryItem: {
          findUnique: async () => null,
          create: async (args: { data: { quantity: Decimal } }) => ({
            id: 'inv-seng',
            ...args.data,
          }),
        },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal } }) => {
            movementQty = args.data.quantity;
            return { id: 'mov-seng', ...args.data, quantityBefore: new Decimal(0), quantityAfter: args.data.quantity };
          },
        },
      }),
  };

  const service = new SuppliersService(prisma as never);
  const result = await service.receivePurchase(createUser(), {
    supplierId: 'sup-2',
    items: [{ productId: 'prod-seng', quantity: 2, unitId: 'unit-roll' }],
  });

  assert.equal(Number(movementQty), 100);
  assert.equal(result.items[0]?.baseQuantityAdded, 100);
  assert.equal(result.items[0]?.quantity, 2);
  assert.equal(result.items[0]?.receiveUnitSymbol, 'roll');
});
