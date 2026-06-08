import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { AuthJwtPayload } from './auth/auth.types';
import { InventoryService } from './inventory/inventory.service';
import { PurchaseOrdersService } from './suppliers/purchase-orders.service';
import { TransactionsService } from './transactions/transactions.service';

function cashier(outletIds: string[]): AuthJwtPayload {
  return {
    sub: 'cashier-1',
    email: 'kasir@test.local',
    tenantId: 'tenant-1',
    role: 'CASHIER',
    outletIds,
  };
}

function manager(outletIds: string[]): AuthJwtPayload {
  return {
    sub: 'mgr-1',
    email: 'mgr@test.local',
    tenantId: 'tenant-1',
    role: 'MANAGER',
    outletIds,
  };
}

test('Outlet isolation: PO detail blocked for outlet outside cashier scope', async () => {
  const po = {
    id: 'po-north',
    tenantId: 'tenant-1',
    outletId: 'outlet-north',
    supplierId: 'sup-1',
    orderNo: 'PO-20260606-0099',
    status: 'ORDERED',
    notes: null,
    orderedAt: new Date(),
    expectedDeliveryAt: null,
    receivedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: { id: 'sup-1', name: 'Supplier', phone: null, email: null, address: null },
    outlet: { id: 'outlet-north', name: 'Cabang Utara', code: 'NORTH', address: null },
    createdBy: { id: 'mgr-1', fullName: 'Manager' },
    submittedBy: null,
    items: [],
    receipts: [],
    returns: [],
  };

  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
    },
  };

  const service = new PurchaseOrdersService(prisma as never);
  await assert.rejects(
    () => service.getPurchaseOrder(cashier(['outlet-main']), 'po-north'),
    (error: unknown) => error instanceof ForbiddenException,
  );
});

test('Outlet isolation: manager may access PO on unassigned tenant outlet', async () => {
  const po = {
    id: 'po-north',
    tenantId: 'tenant-1',
    outletId: 'outlet-north',
    supplierId: 'sup-1',
    orderNo: 'PO-20260606-0099',
    status: 'ORDERED',
    notes: null,
    orderedAt: new Date(),
    expectedDeliveryAt: null,
    receivedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: { id: 'sup-1', name: 'Supplier', phone: null, email: null, address: null },
    outlet: { id: 'outlet-north', name: 'Cabang Utara', code: 'NORTH', address: null },
    createdBy: { id: 'mgr-1', fullName: 'Manager' },
    submittedBy: null,
    items: [],
    receipts: [],
    returns: [],
  };

  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
    },
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.getPurchaseOrder(manager(['outlet-main']), 'po-north');
  assert.equal(result.id, 'po-north');
});

test('Outlet isolation: checkout on outlet A does not deduct outlet B stock', async () => {
  const inventory = new Map<string, number>([
    ['outlet-a:prod-1', 10],
    ['outlet-b:prod-1', 20],
  ]);
  const movements: Array<{ outletId: string; productId: string; type: string }> = [];

  const product = {
    id: 'prod-1',
    name: 'Semen 40kg',
    price: new Decimal(65000),
    costPrice: new Decimal(50000),
    categoryId: null,
    hasVariants: false,
    unitId: 'unit-1',
    moq: new Decimal(1),
    orderStep: new Decimal(1),
    unit: { id: 'unit-1', symbol: 'sak', name: 'Sak' },
    unitConversions: [],
    bundleDefinition: null,
  };

  const prisma = {
    shift: {
      findFirst: async () => ({
        id: 'shift-a',
        outletId: 'outlet-a',
        cashierId: 'cashier-1',
        closedAt: null,
        openedAt: new Date(),
      }),
    },
    product: {
      findMany: async () => [product],
    },
    inventoryItem: {
      findMany: async ({ where }: { where: { outletId: string } }) =>
        [...inventory.entries()]
          .filter(([key]) => key.startsWith(`${where.outletId}:`))
          .map(([key, quantity]) => ({
            productId: key.split(':')[1],
            quantity: new Decimal(quantity),
          })),
      upsert: async ({
        where,
        update,
      }: {
        where: { outletId_productId: { outletId: string; productId: string } };
        update: { quantity: Decimal };
      }) => {
        const key = `${where.outletId_productId.outletId}:${where.outletId_productId.productId}`;
        inventory.set(key, Number(update.quantity));
        return { id: key };
      },
    },
    stockMovement: {
      create: async ({ data }: { data: { outletId: string; productId: string; type: string } }) => {
        movements.push(data);
        return { id: 'mv-1' };
      },
    },
    transaction: {
      findFirst: async () => null,
      create: async ({ data }: { data: { outletId: string; shiftId: string } }) => ({
        id: 'txn-a',
        outletId: data.outletId,
        shiftId: data.shiftId,
        receiptNo: 'TRX-TEST',
        subtotal: new Decimal(65000),
        discount: new Decimal(0),
        tax: new Decimal(0),
        total: new Decimal(65000),
        items: [{ id: 'line-1' }],
        payments: [{ method: 'CASH', amount: new Decimal(70000) }],
      }),
    },
    tenantSettings: {
      findUnique: async () => ({ ppnEnabled: false, ppnRatePercent: new Decimal(11) }),
    },
    customer: {
      update: async () => ({ points: 0 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const service = new TransactionsService(
    prisma as never,
    {
      resolveCheckoutDiscount: async () => ({ discountAmount: 0, promoName: null }),
    } as never,
    {
      resolveOptionalCustomerId: async () => null,
      resolveLoyaltyRedeem: async () => ({ pointsRedeemed: 0, discountIdr: 0 }),
      recordLoyaltyRedeemInTransaction: async () => undefined,
      earnPointsForCompletedTransaction: async () => 0,
      getLoyaltyConfig: async () => ({
        loyaltyPointsEnabled: false,
        loyaltyEarnRateIdr: 10000,
        loyaltyRedeemEnabled: false,
        loyaltyRedeemValueIdr: 1000,
        loyaltyRedeemMaxPercent: 50,
      }),
    } as never,
    {
      getCustomerOutstandingReceivableIdr: async () => 0,
      getCustomerDepositBalanceIdr: async () => 0,
      assertCheckoutFinancePayments: () => undefined,
      applyCheckoutFinanceInTransaction: async () => undefined,
      reverseFinanceForVoid: async () => undefined,
    } as never,
  );
  await service.checkoutCash(manager(['outlet-a', 'outlet-b']), {
    outletId: 'outlet-a',
    items: [{ productId: 'prod-1', quantity: 1 }],
    cashReceived: 70000,
    clientRequestId: 'req-outlet-a',
  });

  assert.equal(inventory.get('outlet-a:prod-1'), 9);
  assert.equal(inventory.get('outlet-b:prod-1'), 20);
  assert.equal(movements.length, 1);
  assert.equal(movements[0]?.outletId, 'outlet-a');
});

test('Outlet isolation: checkout rejected without active shift on outlet', async () => {
  const prisma = {
    shift: { findFirst: async () => null },
    transaction: { findFirst: async () => null },
  };
  const service = new TransactionsService(prisma as never, {} as never, {} as never, {
    getCustomerOutstandingReceivableIdr: async () => 0,
    getCustomerDepositBalanceIdr: async () => 0,
    assertCheckoutFinancePayments: () => undefined,
    applyCheckoutFinanceInTransaction: async () => undefined,
    reverseFinanceForVoid: async () => undefined,
  } as never);

  await assert.rejects(
    () =>
      service.checkoutCash(manager(['outlet-a']), {
        outletId: 'outlet-a',
        items: [{ productId: 'prod-1', quantity: 1 }],
        cashReceived: 10000,
      }),
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === 'SHIFT_NOT_OPEN',
  );
});

test('Outlet isolation: PO receive targets PO outlet inventory', async () => {
  const inventory = new Map<string, number>([['outlet-main:prod-1', 5]]);
  const po = {
    id: 'po-main',
    tenantId: 'tenant-1',
    outletId: 'outlet-main',
    supplierId: 'sup-1',
    orderNo: 'PO-20260606-0002',
    status: 'ORDERED',
    notes: null,
    orderedAt: new Date(),
    expectedDeliveryAt: null,
    receivedAt: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: { id: 'sup-1', name: 'Supplier', phone: null, email: null, address: null },
    outlet: { id: 'outlet-main', name: 'Main', code: 'MAIN', address: null },
    createdBy: { id: 'mgr-1', fullName: 'Manager' },
    submittedBy: { id: 'mgr-1', fullName: 'Manager' },
    items: [
      {
        id: 'po-item-1',
        productId: 'prod-1',
        unitId: null,
        orderedQuantity: new Decimal(2),
        receivedQuantity: new Decimal(0),
        returnedQuantity: new Decimal(0),
        unitCost: new Decimal(10000),
        lineTotal: new Decimal(20000),
        sortOrder: 0,
        product: {
          id: 'prod-1',
          sku: 'PRD-1',
          name: 'Produk',
          costPrice: new Decimal(10000),
          unitId: 'unit-1',
          unit: { id: 'unit-1', symbol: 'pcs', name: 'Pcs' },
          unitConversions: [],
        },
        unit: null,
      },
    ],
    receipts: [],
    returns: [],
  };

  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
      update: async () => ({ ...po, status: 'RECEIVED' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReceipt: { create: async () => ({ id: 'rcpt-1' }) },
        purchaseOrderItem: {
          update: async () => ({}),
          findMany: async () => [{ orderedQuantity: new Decimal(2), receivedQuantity: new Decimal(2) }],
        },
        inventoryItem: {
          findUnique: async ({
            where,
          }: {
            where: { outletId_productId: { outletId: string; productId: string } };
          }) => {
            const qty = inventory.get(`${where.outletId_productId.outletId}:${where.outletId_productId.productId}`);
            return qty != null ? { id: 'inv-1', quantity: new Decimal(qty) } : null;
          },
          update: async ({
            where,
            data,
          }: {
            where: { id: string };
            data: { quantity: Decimal };
          }) => {
            const outletId = po.outletId;
            inventory.set(`${outletId}:prod-1`, Number(data.quantity));
            return { id: where.id };
          },
          create: async ({ data }: { data: { outletId: string; productId: string; quantity: Decimal } }) => {
            inventory.set(`${data.outletId}:${data.productId}`, Number(data.quantity));
            return { id: 'inv-new' };
          },
        },
        stockMovement: { create: async () => ({ id: 'mv-1' }) },
        product: { update: async () => ({}) },
        purchaseOrderReceiptLine: { create: async () => ({ id: 'line-1' }) },
        purchaseOrder: { update: async () => ({ ...po, status: 'RECEIVED' }) },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  await service.receivePurchaseOrder(manager(['outlet-main']), 'po-main', {
    items: [{ purchaseOrderItemId: 'po-item-1', quantityReceived: 2 }],
  });

  assert.equal(inventory.get('outlet-main:prod-1'), 7);
  assert.equal(inventory.get('outlet-north:prod-1'), undefined);
});

test('Outlet isolation: transfer is atomic between outlets', async () => {
  const inventory = new Map<string, number>([
    ['outlet-1:prod-1', 10],
    ['outlet-2:prod-1', 2],
  ]);

  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    product: {
      findFirst: async () => ({
        id: 'prod-1',
        name: 'Produk',
        sku: 'PRD-1',
        hasVariants: false,
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        inventoryItem: {
          findUnique: async ({ where }: { where: { outletId_productId: { outletId: string; productId: string } } }) => {
            const key = `${where.outletId_productId.outletId}:${where.outletId_productId.productId}`;
            const qty = inventory.get(key);
            return qty != null
              ? { id: key, quantity: new Decimal(qty), outletId: where.outletId_productId.outletId, productId: where.outletId_productId.productId }
              : null;
          },
          update: async ({ where, data }: { where: { id: string }; data: { quantity: Decimal } }) => {
            inventory.set(where.id, Number(data.quantity));
            return { id: where.id, quantity: data.quantity };
          },
          create: async ({ data }: { data: { outletId: string; productId: string; quantity: Decimal } }) => {
            const key = `${data.outletId}:${data.productId}`;
            inventory.set(key, Number(data.quantity));
            return { id: key, quantity: data.quantity };
          },
        },
        stockMovement: { create: async () => ({ id: 'mv' }) },
      }),
  };

  const service = new InventoryService(prisma as never);
  await service.transferStock(manager(['outlet-1', 'outlet-2']), {
    fromOutletId: 'outlet-1',
    toOutletId: 'outlet-2',
    productId: 'prod-1',
    quantity: 3,
  });

  assert.equal(inventory.get('outlet-1:prod-1'), 7);
  assert.equal(inventory.get('outlet-2:prod-1'), 5);
});
