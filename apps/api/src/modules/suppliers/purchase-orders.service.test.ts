import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';
import type { AuthJwtPayload } from '../auth/auth.types';
import { PurchaseOrdersService } from './purchase-orders.service';

function createUser(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: 'MANAGER',
    outletIds: ['outlet-1'],
  };
}

const productPaku = {
  id: 'prod-paku',
  sku: 'PKU-2IN',
  name: 'Paku 2"',
  costPrice: new Decimal(15000),
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
};

function buildPo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'po-1',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    supplierId: 'sup-1',
    orderNo: 'PO-20260606-0001',
    status: 'ORDERED',
    notes: null,
    orderedAt: new Date('2026-06-02T08:00:00.000Z'),
    expectedDeliveryAt: null,
    receivedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-06-02T08:00:00.000Z'),
    updatedAt: new Date('2026-06-02T08:00:00.000Z'),
    supplier: { id: 'sup-1', name: 'PT Paku Jaya', phone: '081', email: null, address: null },
    outlet: { id: 'outlet-1', name: 'Cabang Utama', code: 'MAIN', address: 'Jl. Contoh' },
    createdBy: { id: 'manager-1', fullName: 'Manager Demo' },
    submittedBy: { id: 'manager-1', fullName: 'Manager Demo' },
    items: [
      {
        id: 'po-item-1',
        productId: 'prod-paku',
        unitId: 'unit-dus',
        orderedQuantity: new Decimal(4),
        receivedQuantity: new Decimal(0),
        returnedQuantity: new Decimal(0),
        unitCost: new Decimal(375000),
        lineTotal: new Decimal(1500000),
        sortOrder: 0,
        product: productPaku,
        unit: { id: 'unit-dus', symbol: 'dus', name: 'Dus' },
      },
    ],
    receipts: [],
    returns: [],
    ...overrides,
  };
}

test('PurchaseOrders: create draft stores dus line cost', async () => {
  let createdUnitCost: number | null = null;
  const po = buildPo({ status: 'DRAFT', orderedAt: null, submittedBy: null });
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    supplier: { findFirst: async () => ({ id: 'sup-1' }) },
    product: {
      findMany: async () => [
        {
          id: 'prod-paku',
          sku: 'PKU-2IN',
          unitId: 'unit-kg',
          costPrice: new Decimal(15000),
          unitConversions: productPaku.unitConversions.map((row) => ({
            sellUnitId: row.sellUnitId,
            conversionToBase: row.conversionToBase,
            isPurchaseUnit: row.isPurchaseUnit,
            isSellUnit: row.isSellUnit,
            sellStep: row.sellStep,
            minQty: row.minQty,
          })),
        },
      ],
    },
    purchaseOrderSequence: { upsert: async () => ({ lastValue: 1 }) },
    purchaseOrder: {
      create: async (args: {
        data: { items: { create: Array<{ unitCost: Decimal }> } };
      }) => {
        createdUnitCost = Number(args.data.items.create[0]?.unitCost);
        return po;
      },
      findFirst: async () => po,
    },
  };

  const service = new PurchaseOrdersService(prisma as never);
  await service.createPurchaseOrder(createUser(), {
    supplierId: 'sup-1',
    items: [{ productId: 'prod-paku', quantity: 2, unitId: 'unit-dus', unitCost: 375000 }],
  });

  assert.equal(createdUnitCost, 375000);
});

test('PurchaseOrders: submit moves DRAFT to ORDERED', async () => {
  const po = buildPo({ status: 'DRAFT', orderedAt: null, submittedBy: null });
  let submittedStatus: string | null = null;
  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
      update: async (args: { data: { status: string } }) => {
        submittedStatus = args.data.status;
        return buildPo({ status: args.data.status, orderedAt: new Date() });
      },
    },
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.submitPurchaseOrder(createUser(), 'po-1');
  assert.equal(submittedStatus, 'ORDERED');
  assert.equal(result.status, 'ORDERED');
});

test('PurchaseOrders: partial receive updates stock, HPP, and status', async () => {
  const state = { movementQty: null as number | null, updatedCost: null as number | null };
  const po = buildPo({});
  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
      update: async () => buildPo({ status: 'PARTIALLY_RECEIVED' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReceipt: { create: async () => ({ id: 'receipt-1' }) },
        purchaseOrderReceiptLine: { create: async () => ({}) },
        purchaseOrderItem: {
          findMany: async () => [{ orderedQuantity: new Decimal(4), receivedQuantity: new Decimal(2) }],
          update: async () => ({}),
        },
        inventoryItem: { findUnique: async () => null, create: async () => ({}) },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal } }) => {
            state.movementQty = Number(args.data.quantity);
            return { id: 'mov-1' };
          },
        },
        product: {
          update: async (args: { data: { costPrice: Decimal } }) => {
            state.updatedCost = Number(args.data.costPrice);
            return {};
          },
        },
        purchaseOrder: {
          update: async () => buildPo({ status: 'PARTIALLY_RECEIVED' }),
        },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.receivePurchaseOrder(createUser(), 'po-1', {
    items: [{ purchaseOrderItemId: 'po-item-1', quantityReceived: 2, unitCost: 380000 }],
  });

  assert.equal(state.movementQty, 50);
  assert.equal(state.updatedCost, 15200);
  assert.equal(result.status, 'PARTIALLY_RECEIVED');
});

test('PurchaseOrders: full receive sets RECEIVED status', async () => {
  const state = { movementQty: null as number | null, updatedCost: null as number | null };
  const po = buildPo({});
  const prisma = {
    purchaseOrder: { findFirst: async () => po },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReceipt: { create: async () => ({ id: 'receipt-1' }) },
        purchaseOrderReceiptLine: { create: async () => ({}) },
        purchaseOrderItem: {
          findMany: async () => [{ orderedQuantity: new Decimal(4), receivedQuantity: new Decimal(4) }],
          update: async () => ({}),
        },
        inventoryItem: { findUnique: async () => null, create: async () => ({}) },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal } }) => {
            state.movementQty = Number(args.data.quantity);
            return { id: 'mov-1' };
          },
        },
        product: {
          update: async (args: { data: { costPrice: Decimal } }) => {
            state.updatedCost = Number(args.data.costPrice);
            return {};
          },
        },
        purchaseOrder: {
          update: async () => buildPo({ status: 'RECEIVED', receivedAt: new Date() }),
        },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.receivePurchaseOrder(createUser(), 'po-1', {
    items: [{ purchaseOrderItemId: 'po-item-1', quantityReceived: 4, unitCost: 375000 }],
  });

  assert.equal(state.movementQty, 100);
  assert.equal(state.updatedCost, 15000);
  assert.equal(result.status, 'RECEIVED');
});

test('PurchaseOrders: return received qty decreases stock and tracks returned', async () => {
  const state = {
    movementQty: null as number | null,
    movementType: null as string | null,
    returnedQty: null as number | null,
  };
  const po = buildPo({ status: 'RECEIVED', items: [buildPo().items[0]!] });
  po.items[0]!.receivedQuantity = new Decimal(10);
  po.items[0]!.returnedQuantity = new Decimal(0);

  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
    },
    purchaseOrderReturnSequence: { upsert: async () => ({ lastValue: 1 }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReturn: {
          create: async () => ({ id: 'ret-1' }),
          findUniqueOrThrow: async () => ({
            id: 'ret-1',
            returnNo: 'RET-20260606-0001',
            status: 'COMPLETED',
            purchaseOrderId: 'po-1',
            notes: 'Retur rusak',
            returnedAt: new Date(),
            createdAt: new Date(),
            createdBy: { id: 'manager-1', fullName: 'Manager Demo' },
            purchaseOrder: po,
            lines: [],
          }),
        },
        purchaseOrderReturnLine: { create: async () => ({}) },
        purchaseOrderItem: {
          update: async (args: { data: { returnedQuantity: Decimal } }) => {
            state.returnedQty = Number(args.data.returnedQuantity);
            return {};
          },
        },
        inventoryItem: {
          findUnique: async () => ({ id: 'inv-1', quantity: new Decimal(100) }),
          update: async () => ({}),
        },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal; type: string } }) => {
            state.movementQty = Number(args.data.quantity);
            state.movementType = args.data.type;
            return { id: 'mov-ret-1' };
          },
        },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.createPurchaseOrderReturn(createUser(), 'po-1', {
    notes: 'Retur rusak',
    items: [{ purchaseOrderItemId: 'po-item-1', quantityReturned: 2, reason: 'DAMAGED' }],
  });

  assert.equal(state.movementQty, -50);
  assert.equal(state.movementType, 'PURCHASE_RETURN');
  assert.equal(state.returnedQty, 2);
  assert.equal(result.returnNo, 'RET-20260606-0001');
});

test('PurchaseOrders: cannot return more than returnable qty', async () => {
  const po = buildPo({ status: 'RECEIVED' });
  po.items[0]!.receivedQuantity = new Decimal(10);
  po.items[0]!.returnedQuantity = new Decimal(0);

  const prisma = {
    purchaseOrder: { findFirst: async () => po },
    purchaseOrderReturnSequence: { upsert: async () => ({ lastValue: 1 }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReturn: { create: async () => ({ id: 'ret-1' }) },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  await assert.rejects(
    () =>
      service.createPurchaseOrderReturn(createUser(), 'po-1', {
        items: [{ purchaseOrderItemId: 'po-item-1', quantityReturned: 11, reason: 'EXCESS' }],
      }),
    (err: Error & { response?: { code?: string } }) => {
      assert.match(err.message, /melebihi/i);
      return true;
    },
  );
});

test('PurchaseOrders: multi-unit return converts to base stock deduction', async () => {
  const state = { movementQty: null as number | null };
  const po = buildPo({ status: 'PARTIALLY_RECEIVED' });
  po.items[0]!.receivedQuantity = new Decimal(2);
  po.items[0]!.returnedQuantity = new Decimal(0);

  const prisma = {
    purchaseOrder: { findFirst: async () => po },
    purchaseOrderReturnSequence: { upsert: async () => ({ lastValue: 2 }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderReturn: {
          create: async () => ({ id: 'ret-2' }),
          findUniqueOrThrow: async () => ({
            id: 'ret-2',
            returnNo: 'RET-20260606-0002',
            status: 'COMPLETED',
            purchaseOrderId: 'po-1',
            notes: null,
            returnedAt: new Date(),
            createdAt: new Date(),
            createdBy: { id: 'manager-1', fullName: 'Manager Demo' },
            purchaseOrder: po,
            lines: [],
          }),
        },
        purchaseOrderReturnLine: { create: async () => ({}) },
        purchaseOrderItem: { update: async () => ({}) },
        inventoryItem: {
          findUnique: async () => ({ id: 'inv-1', quantity: new Decimal(100) }),
          update: async () => ({}),
        },
        stockMovement: {
          create: async (args: { data: { quantity: Decimal } }) => {
            state.movementQty = Number(args.data.quantity);
            return {};
          },
        },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  await service.createPurchaseOrderReturn(createUser(), 'po-1', {
    items: [{ purchaseOrderItemId: 'po-item-1', quantityReturned: 0.5, reason: 'WRONG_ITEM' }],
  });

  assert.equal(state.movementQty, -12.5);
});

test('PurchaseOrders: cancel remaining unreceived lines', async () => {
  const po = buildPo({ status: 'PARTIALLY_RECEIVED' });
  po.items[0]!.orderedQuantity = new Decimal(10);
  po.items[0]!.receivedQuantity = new Decimal(4);

  let updatedOrdered: number | null = null;
  const prisma = {
    purchaseOrder: {
      findFirst: async () => po,
      update: async () => buildPo({ status: 'RECEIVED' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderItem: {
          update: async (args: { data: { orderedQuantity: Decimal } }) => {
            updatedOrdered = Number(args.data.orderedQuantity);
            return {};
          },
          findMany: async () => [
            { orderedQuantity: new Decimal(4), receivedQuantity: new Decimal(4) },
          ],
        },
        purchaseOrder: {
          update: async () => buildPo({ status: 'RECEIVED' }),
        },
      }),
  };

  const service = new PurchaseOrdersService(prisma as never);
  const result = await service.cancelRemainingPurchaseOrder(createUser(), 'po-1');
  assert.equal(updatedOrdered, 4);
  assert.equal(result.status, 'RECEIVED');
});
