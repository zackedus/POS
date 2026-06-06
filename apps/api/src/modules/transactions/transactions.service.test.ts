import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { TransactionsService } from './transactions.service';

function createPromoServiceStub() {
  return {
    resolveCheckoutDiscount: async () => ({ discountAmount: 0 }),
  };
}

function createTransactionsService(prisma: unknown) {
  const withDefaults = {
    tenantSettings: {
      findUnique: async () => null,
    },
    ...(prisma as object),
  };
  return new TransactionsService(withDefaults as never, createPromoServiceStub() as never);
}

function createUser(role: AuthJwtPayload['role'] = 'CASHIER'): AuthJwtPayload {
  return {
    sub: role === 'MANAGER' ? 'manager-1' : 'cashier-1',
    email: role === 'MANAGER' ? 'manager@barokah.test' : 'cashier@barokah.test',
    tenantId: 'tenant-1',
    role,
    outletIds: ['outlet-1'],
  };
}

function sellableProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Semen',
    price: 100000,
    costPrice: 90000,
    hasVariants: false,
    unitId: 'unit-1',
    moq: 1,
    orderStep: 1,
    unit: { id: 'unit-1', symbol: 'sak', name: 'Sak' },
    unitConversions: [],
    bundleDefinition: null,
    ...overrides,
  };
}

function completedTransactionFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'txn-1',
    receiptNo: 'TRX-001',
    outletId: 'outlet-1',
    status: 'COMPLETED',
    subtotal: 100000,
    discount: 0,
    tax: 0,
    total: 100000,
    notes: null,
    completedAt: new Date(),
    outlet: { id: 'outlet-1', name: 'Cabang Utama', code: 'MAIN', address: 'Jl. A', tenantId: 'tenant-1' },
    cashier: { id: 'cashier-1', fullName: 'Kasir Demo' },
    items: [
      {
        productName: 'Semen',
        quantity: 1,
        unitPrice: 100000,
        subtotal: 100000,
      },
    ],
    payments: [{ method: 'CASH', amount: 100000, reference: null }],
    adjustments: [],
    ...overrides,
  };
}

test('Transactions: recallHeldTransaction detects stock conflict early', async () => {
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-1',
        label: 'Hold A',
        total: 100000,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        items: [{ productId: 'prod-1', productName: 'Semen', quantity: 3, unitPrice: 50000, sellUnitId: null, sellUnitSymbol: null }],
      }),
      delete: async () => {
        throw new Error('delete should not be called when stock conflict occurs');
      },
    },
    product: {
      findMany: async () => [
        {
          id: 'prod-1',
          name: 'Semen',
          unitId: 'unit-1',
          unitConversions: [],
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 1 }],
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.recallHeldTransaction(createUser(), 'held-1', 'outlet-1'),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_STOCK);
      return true;
    },
  );
});

test('Transactions: checkoutSplit validates payment total equals transaction total', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called when payment sum is invalid');
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 40000 },
          { method: PaymentMethod.TRANSFER, amount: 50000 },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit rejects invalid payment mix with duplicated method', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called when payment mix is invalid');
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 70000 },
          { method: PaymentMethod.CASH, amount: 30000 },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit supports QRIS and CARD mix', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
      update: async () => undefined,
    },
    stockMovement: {
      create: async () => undefined,
    },
    transaction: {
      create: async () => ({
        id: 'txn-1',
        receiptNo: 'TRX-1',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: 100000,
        total: 100000,
        completedAt: new Date(),
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const service = createTransactionsService(prisma);
  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
    payments: [
      { method: PaymentMethod.QRIS, amount: 70000 },
      { method: PaymentMethod.CARD, amount: 30000 },
    ],
  });

  assert.deepEqual(result.payments, { QRIS: 70000, CARD: 30000 });
});

test('Transactions: checkoutSplit rejects unsupported split method', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called when payment method is unsupported');
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 50000 },
          { method: 'BANK_TRANSFER' as PaymentMethod, amount: 50000 },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit retries on serializable conflict (P2034)', async () => {
  let transactionCalls = 0;
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
      update: async () => undefined,
    },
    stockMovement: {
      create: async () => undefined,
    },
    transaction: {
      create: async () => ({
        id: 'txn-retry',
        receiptNo: 'TRX-RETRY-1',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: 100000,
        total: 100000,
        completedAt: new Date(),
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      transactionCalls += 1;
      if (transactionCalls < 3) {
        throw { code: 'P2034' };
      }
      return fn(prisma);
    },
  };

  const service = createTransactionsService(prisma);
  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
    payments: [
      { method: PaymentMethod.CASH, amount: 40000 },
      { method: PaymentMethod.TRANSFER, amount: 60000 },
    ],
  });

  assert.equal(result.id, 'txn-retry');
  assert.equal(transactionCalls, 3);
});

test('Transactions: recallHeldTransaction removes expired hold and throws validation error', async () => {
  let deletedId: string | null = null;
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-expired',
        label: 'Hold Expired',
        total: 100000,
        expiresAt: new Date(Date.now() - 30_000),
        items: [{ productId: 'prod-1', productName: 'Semen', quantity: 1, unitPrice: 100000 }],
      }),
      delete: async ({ where }: { where: { id: string } }) => {
        deletedId = where.id;
      },
    },
    inventoryItem: {
      findMany: async () => [],
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.recallHeldTransaction(createUser(), 'held-expired', 'outlet-1'),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
  assert.equal(deletedId, 'held-expired');
});

test('Transactions: recallHeldTransaction returns conflict on concurrent recall', async () => {
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-2',
        label: 'Hold Shared',
        total: 100000,
        expiresAt: new Date(Date.now() + 30_000),
        items: [{ productId: 'prod-1', productName: 'Semen', quantity: 1, unitPrice: 100000, sellUnitId: null, sellUnitSymbol: null }],
      }),
      delete: async () => {
        const error = { code: 'P2025' };
        throw error;
      },
    },
    product: {
      findMany: async () => [
        {
          id: 'prod-1',
          name: 'Semen',
          unitId: 'unit-1',
          unitConversions: [],
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 2 }],
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.recallHeldTransaction(createUser(), 'held-2', 'outlet-1'),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.CONFLICT);
      return true;
    },
  );
});

test('Transactions: holdTransaction rejects parent product with variants', async () => {
  const prisma = {
    product: {
      findMany: async () => [{ id: 'prod-parent', name: 'Cat Tembok', price: 95000, hasVariants: true }],
    },
    heldTransaction: {
      create: async () => {
        throw new Error('heldTransaction.create should not be called for parent product');
      },
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.holdTransaction(createUser(), {
        outletId: 'outlet-1',
        label: 'Hold varian invalid',
        items: [{ productId: 'prod-parent', quantity: 1 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit rejects parent product with variants', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [{ id: 'prod-parent', name: 'Cat Tembok', price: 95000, hasVariants: true }],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-parent', quantity: 10 }],
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called for parent product');
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-parent', quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 40000 },
          { method: PaymentMethod.TRANSFER, amount: 55000 },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit returns existing transaction by clientRequestId', async () => {
  const prisma = {
    transaction: {
      findFirst: async () => ({
        id: 'txn-existing',
        receiptNo: 'TRX-EXISTING',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: 100000,
        total: 100000,
        completedAt: new Date(),
        items: [{ id: 'item-1' }],
        payments: [
          { method: PaymentMethod.CASH, amount: 40000 },
          { method: PaymentMethod.TRANSFER, amount: 60000 },
        ],
      }),
    },
    shift: { findFirst: async () => ({ id: 'shift-1' }) },
    product: { findMany: async () => [] },
    inventoryItem: { findMany: async () => [] },
    $transaction: async () => {
      throw new Error('$transaction should not be called for idempotent replay');
    },
  };

  const service = createTransactionsService(prisma);
  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
    payments: [
      { method: PaymentMethod.CASH, amount: 40000 },
      { method: PaymentMethod.TRANSFER, amount: 60000 },
    ],
    clientRequestId: 'req-001',
  });

  assert.equal(result.id, 'txn-existing');
  assert.deepEqual(result.payments, { CASH: 40000, TRANSFER: 60000 });
});

test('Transactions: holdTransaction returns existing hold by clientRequestId', async () => {
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-existing',
        label: 'Meja 1',
        total: 50000,
        expiresAt: new Date(Date.now() + 60_000),
        items: [
          {
            productId: 'prod-1',
            productName: 'Semen',
            unitPrice: 50000,
            quantity: 1,
          },
        ],
      }),
      create: async () => {
        throw new Error('heldTransaction.create should not be called for idempotent replay');
      },
    },
    product: { findMany: async () => [] },
  };

  const service = createTransactionsService(prisma);
  const result = await service.holdTransaction(createUser(), {
    outletId: 'outlet-1',
    clientRequestId: 'offline-hold-req-001',
    items: [{ productId: 'prod-1', quantity: 1 }],
  });

  assert.equal(result.id, 'held-existing');
  assert.equal(result.idempotentReplay, true);
});

test('Transactions: checkoutSplit deducts stock from bundle components', async () => {
  const updates: Array<{ productId: string; quantity: number }> = [];
  const prisma = {
    transaction: {
      findFirst: async () => null,
      create: async () => ({
        id: 'txn-bundle',
        receiptNo: 'TRX-BUNDLE',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: 400000,
        total: 400000,
        completedAt: new Date(),
      }),
    },
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [
        {
          ...sellableProduct({
            id: 'prod-bundle',
            name: 'Paket Renovasi Mini',
            price: 200000,
            bundleDefinition: {
              id: 'bundle-1',
              isActive: true,
              outletPolicies: [],
              items: [{ componentProductId: 'prod-semen', quantity: 2, componentProduct: { id: 'prod-semen', name: 'Semen', costPrice: 70000 } }],
            },
          }),
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-semen', quantity: 10 }],
      update: async ({
        where,
        data,
      }: {
        where: { outletId_productId: { productId: string } };
        data: { quantity: unknown };
      }) => {
        updates.push({ productId: where.outletId_productId.productId, quantity: Number(data.quantity) });
      },
    },
    stockMovement: {
      create: async () => undefined,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const service = createTransactionsService(prisma);
  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-bundle', quantity: 2 }],
    payments: [
      { method: PaymentMethod.CASH, amount: 200000 },
      { method: PaymentMethod.TRANSFER, amount: 200000 },
    ],
  });

  assert.deepEqual(updates, [{ productId: 'prod-semen', quantity: 6 }]);
});

test('Transactions: checkoutSplit applies outlet bundle policy disable', async () => {
  const updates: Array<{ productId: string; quantity: number }> = [];
  const prisma = {
    transaction: {
      findFirst: async () => null,
      create: async () => ({
        id: 'txn-outlet-policy',
        receiptNo: 'TRX-OUTLET-POLICY',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: 200000,
        total: 200000,
        completedAt: new Date(),
      }),
    },
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [
        {
          ...sellableProduct({
            id: 'prod-bundle',
            name: 'Paket Renovasi Mini',
            price: 200000,
            bundleDefinition: {
              id: 'bundle-1',
              isActive: true,
              outletPolicies: [{ outletId: 'outlet-1', isActive: false }],
              items: [{ componentProductId: 'prod-semen', quantity: 2, componentProduct: { id: 'prod-semen', name: 'Semen', costPrice: 70000 } }],
            },
          }),
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-bundle', quantity: 10 }],
      update: async ({
        where,
        data,
      }: {
        where: { outletId_productId: { productId: string } };
        data: { quantity: unknown };
      }) => {
        updates.push({ productId: where.outletId_productId.productId, quantity: Number(data.quantity) });
      },
    },
    stockMovement: {
      create: async () => undefined,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const service = createTransactionsService(prisma);
  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-bundle', quantity: 2 }],
    payments: [
      { method: PaymentMethod.CASH, amount: 200000 },
      { method: PaymentMethod.TRANSFER, amount: 200000 },
    ],
  });

  assert.deepEqual(updates, [{ productId: 'prod-bundle', quantity: 8 }]);
});

test('Transactions: checkoutSplit maps gateway timeout to payment timeout code', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [sellableProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called when gateway timeout is mapped');
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [
          { method: PaymentMethod.CASH, amount: 50000 },
          { method: PaymentMethod.QRIS, amount: 50000, reference: 'GW_TIMEOUT' },
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.PAYMENT_TIMEOUT);
      return true;
    },
  );
});

test('SCR-V01: voidTransaction rejects non-completed transaction', async () => {
  const prisma = {
    transaction: {
      findFirst: async () =>
        completedTransactionFixture({
          status: 'VOID',
        }),
    },
  };
  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.voidTransaction(createUser('MANAGER'), 'txn-1', { reason: 'Salah input' }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.TRANSACTION_ALREADY_CLOSED);
      return true;
    },
  );
});

test('SCR-V02: voidTransaction creates adjustment and audit log', async () => {
  let auditCreated = false;
  let stockRestored = false;
  const prisma = {
    transaction: {
      findFirst: async () => completedTransactionFixture(),
      update: async () => ({ id: 'txn-1', status: 'VOID' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        transactionAdjustment: {
          create: async () => ({
            id: 'adj-1',
            reason: 'Salah scan',
            approvedById: 'manager-1',
            createdAt: new Date(),
          }),
        },
        transaction: {
          update: async () => undefined,
        },
        stockMovement: {
          findMany: async () => [
            {
              productId: 'prod-1',
              quantity: -1,
            },
          ],
          create: async () => {
            stockRestored = true;
          },
        },
        inventoryItem: {
          findUnique: async () => ({ quantity: 5 }),
          update: async () => undefined,
        },
        auditLog: {
          create: async () => {
            auditCreated = true;
          },
        },
      }),
  };

  const service = createTransactionsService(prisma);
  const result = await service.voidTransaction(createUser('MANAGER'), 'txn-1', {
    reason: 'Salah scan barcode',
  });

  assert.equal(result.status, 'VOID');
  assert.equal(result.adjustment.amount, 100000);
  assert.equal(auditCreated, true);
  assert.equal(stockRestored, true);
});

test('SCR-V03: refundTransaction rejects amount above remaining', async () => {
  const prisma = {
    transaction: {
      findFirst: async () =>
        completedTransactionFixture({
          adjustments: [{ type: 'REFUND', amount: 40000 }],
        }),
    },
  };
  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.refundTransaction(createUser('MANAGER'), 'txn-1', {
        reason: 'Retur sebagian',
        amount: 70000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('SCR-V05: getReceipt forbidden for outlet outside user scope', async () => {
  const prisma = {
    transaction: {
      findFirst: async () =>
        completedTransactionFixture({
          outletId: 'outlet-2',
          outlet: { id: 'outlet-2', name: 'Cabang Utara', code: 'NORTH', address: null, tenantId: 'tenant-1' },
        }),
    },
  };
  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.getReceipt(createUser('CASHIER'), 'txn-1'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('SCR-V06: getReceipt returns digital receipt and escpos stub', async () => {
  const prisma = {
    transaction: {
      findFirst: async () => completedTransactionFixture(),
    },
    tenant: {
      findUnique: async () => ({ name: 'Barokah Toko Bangunan' }),
    },
  };
  const service = createTransactionsService(prisma);
  const result = await service.getReceipt(createUser('CASHIER'), 'txn-1');
  assert.equal(result.receipt.receiptNo, 'TRX-001');
  assert.equal(result.receipt.netTotal, 100000);
  assert.equal(result.escpos.format, 'escpos');
});

test('Transactions: validateCart returns negative margin warning without exposing cost', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: 'prod-1',
          name: 'Semen',
          price: { toString: () => '70000' },
          costPrice: { toString: () => '75000' },
          hasVariants: false,
          unitId: 'unit-1',
          moq: 1,
          orderStep: 1,
          unit: { id: 'unit-1', symbol: 'sak', name: 'Sak' },
          unitConversions: [],
          bundleDefinition: null,
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 10 }],
    },
  };
  const service = createTransactionsService(prisma);
  const result = await service.validateCart(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
  });
  assert.equal(result.hasNegativeMargin, true);
  assert.equal(result.marginWarnings.length, 1);
  assert.match(result.marginWarnings[0]?.message ?? '', /margin negatif/i);
  assert.equal((result.marginWarnings[0] as { costPrice?: number }).costPrice, undefined);
});

function sengProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-seng',
    name: 'Seng Galvalum',
    price: 45000,
    costPrice: 38000,
    hasVariants: false,
    unitId: 'unit-m',
    moq: 0.5,
    orderStep: 0.5,
    unit: { id: 'unit-m', symbol: 'm', name: 'Meter' },
    unitConversions: [
      {
        sellUnitId: 'unit-roll',
        conversionToBase: 50,
        isPurchaseUnit: true,
        isSellUnit: true,
        sellStep: 1,
        minQty: 1,
        sellUnit: { id: 'unit-roll', symbol: 'roll', name: 'Roll' },
      },
    ],
    bundleDefinition: null,
    ...overrides,
  };
}

function pakuProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-paku',
    name: 'Paku 2"',
    price: 18000,
    costPrice: 15000,
    hasVariants: false,
    unitId: 'unit-kg',
    moq: 0.5,
    orderStep: 0.5,
    unit: { id: 'unit-kg', symbol: 'kg', name: 'Kilogram' },
    unitConversions: [
      {
        sellUnitId: 'unit-dus',
        conversionToBase: 20,
        isPurchaseUnit: true,
        isSellUnit: true,
        sellStep: 1,
        minQty: 1,
        sellUnit: { id: 'unit-dus', symbol: 'dus', name: 'Dus' },
      },
    ],
    bundleDefinition: null,
    ...overrides,
  };
}

function checkoutPrismaMock(options: {
  product: ReturnType<typeof sengProduct> | ReturnType<typeof pakuProduct>;
  stockQty: number;
  onUpdate?: (productId: string, quantity: number) => void;
}) {
  const updates: Array<{ productId: string; quantity: number }> = [];
  const mock = {
    transaction: {
      findFirst: async () => null,
      create: async ({
        data,
      }: {
        data: {
          subtotal: { toString(): string };
          total: { toString(): string };
          tax?: { toString(): string };
          discount?: { toString(): string };
        };
      }) => ({
        id: 'txn-seng',
        receiptNo: 'TRX-SENG',
        outletId: 'outlet-1',
        shiftId: 'shift-1',
        cashierId: 'cashier-1',
        subtotal: Number(data.subtotal),
        total: Number(data.total),
        tax: data.tax != null ? Number(data.tax) : 0,
        discount: data.discount != null ? Number(data.discount) : undefined,
        completedAt: new Date(),
      }),
    },
    shift: {
      findFirst: async () => ({ id: 'shift-1' }),
    },
    product: {
      findMany: async () => [options.product],
    },
    inventoryItem: {
      findMany: async () => [{ productId: options.product.id, quantity: options.stockQty }],
      update: async ({
        where,
        data,
      }: {
        where: { outletId_productId: { productId: string } };
        data: { quantity: unknown };
      }) => {
        const row = {
          productId: where.outletId_productId.productId,
          quantity: Number(data.quantity),
        };
        updates.push(row);
        options.onUpdate?.(row.productId, row.quantity);
      },
    },
    stockMovement: {
      create: async () => undefined,
    },
    tenantSettings: {
      findUnique: async () => null,
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(mock),
    updates,
  };
  return mock;
}

test('Transactions: checkoutSplit deducts 12.5 m base stock for seng meter sale', async () => {
  const prisma = checkoutPrismaMock({ product: sengProduct(), stockQty: 100 });
  const service = createTransactionsService(prisma);

  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-seng', quantity: 12.5 }],
    payments: [{ method: PaymentMethod.CASH, amount: Math.round(45000 * 12.5) }],
  });

  assert.deepEqual(prisma.updates, [{ productId: 'prod-seng', quantity: 87.5 }]);
});

test('Transactions: checkoutSplit deducts 50 m base stock when selling 1 roll', async () => {
  const prisma = checkoutPrismaMock({ product: sengProduct(), stockQty: 87.5 });
  const service = createTransactionsService(prisma);

  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' }],
    payments: [{ method: PaymentMethod.CASH, amount: Math.round(45000 * 50) }],
  });

  assert.deepEqual(prisma.updates, [{ productId: 'prod-seng', quantity: 37.5 }]);
});

test('Transactions: checkoutSplit rejects seng sale exceeding base stock', async () => {
  const prisma = checkoutPrismaMock({ product: sengProduct(), stockQty: 37.5 });
  const service = createTransactionsService(prisma);

  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-seng', quantity: 100 }],
        payments: [{ method: PaymentMethod.CASH, amount: 4500000 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_STOCK);
      return true;
    },
  );
});

test('Transactions: checkoutSplit deducts 2.5 kg base stock for paku ecer sale at 18.000/kg', async () => {
  const prisma = checkoutPrismaMock({ product: pakuProduct(), stockQty: 200 });
  const service = createTransactionsService(prisma);

  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-paku', quantity: 2.5 }],
    payments: [{ method: PaymentMethod.CASH, amount: Math.round(18000 * 2.5) }],
  });

  assert.deepEqual(prisma.updates, [{ productId: 'prod-paku', quantity: 197.5 }]);
});

test('Transactions: checkoutSplit deducts 20 kg base stock when selling 1 dus paku at 360.000/dus', async () => {
  const prisma = checkoutPrismaMock({ product: pakuProduct(), stockQty: 197.5 });
  const service = createTransactionsService(prisma);

  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-paku', quantity: 1, sellUnitId: 'unit-dus' }],
    payments: [{ method: PaymentMethod.CASH, amount: Math.round(18000 * 20) }],
  });

  assert.deepEqual(prisma.updates, [{ productId: 'prod-paku', quantity: 177.5 }]);
});

test('Transactions: holdTransaction persists sellUnitId and roll total for seng', async () => {
  let createdItems: Array<Record<string, unknown>> = [];
  const prisma = {
    heldTransaction: {
      findFirst: async () => null,
      create: async ({ data }: { data: { items: { create: Array<Record<string, unknown>> }; total: unknown } }) => {
        createdItems = data.items.create;
        return {
          id: 'held-seng-roll',
          label: 'Hold roll',
          total: data.total,
          expiresAt: new Date(Date.now() + 60_000),
          items: data.items.create.map((item, index) => ({
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            sellUnitId: item.sellUnitId,
            sellUnitSymbol: item.sellUnitSymbol,
            id: `item-${index}`,
          })),
        };
      },
    },
    product: {
      findMany: async () => [sengProduct()],
    },
  };

  const service = createTransactionsService(prisma);
  const result = await service.holdTransaction(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' }],
    label: 'Hold roll',
  });

  assert.equal(result.total, 2_250_000);
  assert.equal(createdItems.length, 1);
  assert.equal(createdItems[0]?.sellUnitId, 'unit-roll');
  assert.equal(createdItems[0]?.sellUnitSymbol, 'roll');
  assert.equal(Number(createdItems[0]?.unitPrice), 2_250_000);
});

test('Transactions: recallHeldTransaction returns sellUnitId and checks base stock for roll', async () => {
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-roll',
        label: 'Hold roll',
        total: 2_250_000,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        items: [
          {
            productId: 'prod-seng',
            productName: 'Seng Galvalum',
            quantity: 1,
            unitPrice: 2_250_000,
            sellUnitId: 'unit-roll',
            sellUnitSymbol: 'roll',
          },
        ],
      }),
      delete: async () => undefined,
    },
    product: {
      findMany: async () => [
        {
          id: 'prod-seng',
          name: 'Seng Galvalum',
          unitId: 'unit-m',
          unitConversions: sengProduct().unitConversions,
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-seng', quantity: 100 }],
    },
  };

  const service = createTransactionsService(prisma);
  const result = await service.recallHeldTransaction(createUser(), 'held-roll', 'outlet-1');

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.sellUnitId, 'unit-roll');
  assert.equal(result.items[0]?.price, 2_250_000);
  assert.equal(result.items[0]?.quantity, 1);
});

test('Transactions: recallHeldTransaction rejects roll recall when base stock insufficient', async () => {
  const prisma = {
    heldTransaction: {
      findFirst: async () => ({
        id: 'held-roll',
        label: 'Hold roll',
        total: 2_250_000,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        items: [
          {
            productId: 'prod-seng',
            productName: 'Seng Galvalum',
            quantity: 1,
            unitPrice: 2_250_000,
            sellUnitId: 'unit-roll',
            sellUnitSymbol: 'roll',
          },
        ],
      }),
      delete: async () => {
        throw new Error('delete should not be called when stock conflict occurs');
      },
    },
    product: {
      findMany: async () => [
        {
          id: 'prod-seng',
          name: 'Seng Galvalum',
          unitId: 'unit-m',
          unit: { id: 'unit-m', symbol: 'm', name: 'Meter' },
          unitConversions: sengProduct().unitConversions,
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-seng', quantity: 40 }],
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () => service.recallHeldTransaction(createUser(), 'held-roll', 'outlet-1'),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as {
        code?: string;
        message?: string;
        details?: Array<{ message?: string }>;
      };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_STOCK);
      assert.match(response.message ?? '', /Recall gagal — Stok tidak cukup/i);
      assert.match(response.message ?? '', /40 m \(0,8 roll\)/);
      assert.match(response.message ?? '', /1 roll \(50 m\)/);
      return true;
    },
  );
});

test('Transactions: validateCart returns structured stock issues for insufficient roll sale', async () => {
  const prisma = {
    product: {
      findMany: async () => [sengProduct()],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-seng', quantity: 40 }],
    },
  };
  const service = createTransactionsService(prisma);
  const result = await service.validateCart(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' }],
  });

  assert.equal(result.hasInsufficientStock, true);
  assert.equal(result.stockIssues.length, 1);
  assert.match(result.stockIssues[0]?.message ?? '', /40 m \(0,8 roll\)/);
  assert.match(result.stockIssues[0]?.message ?? '', /1 roll \(50 m\)/);
});

test('Transactions: checkoutSplit returns empty-stock message when inventory is zero', async () => {
  const prisma = checkoutPrismaMock({ product: sellableProduct(), stockQty: 0 });
  const service = createTransactionsService(prisma);

  await assert.rejects(
    () =>
      service.checkoutSplit(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [{ method: PaymentMethod.CASH, amount: 100000 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string; message?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_STOCK);
      assert.match(response.message ?? '', /Stok Semen habis/i);
      return true;
    },
  );
});

test('Transactions: validateCart warns on roll sell below package cost', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        sengProduct({
          price: 30000,
          costPrice: 38000,
        }),
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-seng', quantity: 100 }],
    },
  };
  const service = createTransactionsService(prisma);
  const result = await service.validateCart(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' }],
  });

  assert.equal(result.hasNegativeMargin, true);
  assert.equal(result.marginWarnings.length, 1);
  assert.match(result.marginWarnings[0]?.message ?? '', /margin negatif/i);
});

test('Transactions: validateCart rejects parent product with variants', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: 'prod-parent',
          name: 'Cat Tembok',
          price: 95000,
          costPrice: 70000,
          hasVariants: true,
          unitId: 'unit-1',
          moq: 1,
          orderStep: 1,
          unit: { id: 'unit-1', symbol: 'kaleng', name: 'Kaleng' },
          unitConversions: [],
          bundleDefinition: null,
        },
      ],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-parent', quantity: 10 }],
    },
  };

  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.validateCart(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'prod-parent', quantity: 1 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('Transactions: checkoutSplit uses variant SKU own price', async () => {
  const variantProduct = {
    id: 'variant-5l',
    name: 'Cat Tembok — 5 Liter',
    price: 125000,
    costPrice: 90000,
    hasVariants: false,
    unitId: 'unit-1',
    moq: 1,
    orderStep: 1,
    unit: { id: 'unit-1', symbol: 'kaleng', name: 'Kaleng' },
    unitConversions: [],
    bundleDefinition: null,
  };
  const prisma = checkoutPrismaMock({ product: variantProduct, stockQty: 5 });
  const service = createTransactionsService(prisma);

  await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'variant-5l', quantity: 2 }],
    payments: [{ method: PaymentMethod.CASH, amount: 250_000 }],
  });

  assert.deepEqual(prisma.updates, [{ productId: 'variant-5l', quantity: 3 }]);
});

test('Transactions: checkoutSplit applies promo discount to total', async () => {
  const promoService = {
    resolveCheckoutDiscount: async () => ({
      discountAmount: 20_000,
      promoRuleId: 'promo-1',
      promoName: 'Diskon 10%',
    }),
  };
  const prisma = checkoutPrismaMock({ product: sellableProduct(), stockQty: 10 });
  const service = new TransactionsService(prisma as never, promoService as never);

  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
    payments: [{ method: PaymentMethod.CASH, amount: 80_000 }],
    promoRuleId: 'promo-1',
  });

  assert.equal(result.total, 80_000);
  assert.equal(result.subtotal, 100_000);
  assert.equal(result.discount, 20_000);
});

test('Phase 8 BL-08-01: checkoutSplit promo + multi-unit same cart', async () => {
  const promoService = {
    resolveCheckoutDiscount: async () => ({
      discountAmount: 5_000,
      promoRuleId: 'promo-mu',
      promoName: 'Promo multi-unit',
    }),
  };
  const prisma = checkoutPrismaMock({ product: pakuProduct(), stockQty: 100 });
  const service = new TransactionsService(prisma as never, promoService as never);

  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [
      { productId: 'prod-paku', quantity: 2.5, sellUnitId: 'unit-kg' },
      { productId: 'prod-paku', quantity: 1, sellUnitId: 'unit-dus' },
    ],
    payments: [{ method: PaymentMethod.CASH, amount: 400_000 }],
    promoRuleId: 'promo-mu',
  });

  assert.equal(result.subtotal, 405_000);
  assert.equal(result.discount, 5_000);
  assert.equal(result.total, 400_000);
  assert.deepEqual(prisma.updates, [{ productId: 'prod-paku', quantity: 77.5 }]);
});

test('Phase 8 BL-08-02: checkoutSplit applies PPN when tenant settings enabled', async () => {
  const base = checkoutPrismaMock({ product: sellableProduct(), stockQty: 10 });
  const prisma = {
    ...base,
    tenantSettings: {
      findUnique: async () => ({
        ppnEnabled: true,
        ppnRatePercent: { toString: () => '11' },
      }),
    },
  };
  const service = createTransactionsService(prisma);

  const result = await service.checkoutSplit(createUser(), {
    outletId: 'outlet-1',
    items: [{ productId: 'prod-1', quantity: 1 }],
    payments: [{ method: PaymentMethod.CASH, amount: 111_000 }],
  });

  assert.equal(result.subtotal, 100_000);
  assert.equal(result.tax, 11_000);
  assert.equal(result.total, 111_000);
});

test('Phase 8 BL-08-03: voidTransaction restores multi-unit sale stock in base qty', async () => {
  let restoredQty: number | null = null;
  const prisma = {
    transaction: {
      findFirst: async () =>
        completedTransactionFixture({
          items: [
            {
              productName: 'Paku',
              quantity: 1,
              unitPrice: 360_000,
              subtotal: 360_000,
            },
          ],
        }),
      update: async () => ({ id: 'txn-1', status: 'VOID' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        transactionAdjustment: {
          create: async () => ({
            id: 'adj-mu',
            reason: 'Salah unit',
            approvedById: 'manager-1',
            createdAt: new Date(),
          }),
        },
        transaction: { update: async () => undefined },
        stockMovement: {
          findMany: async () => [
            { productId: 'prod-paku', quantity: -20 },
          ],
          create: async (args: { data: { quantity: unknown } }) => {
            restoredQty = Number(args.data.quantity);
          },
        },
        inventoryItem: {
          findUnique: async () => ({ quantity: 40 }),
          update: async () => undefined,
        },
        auditLog: { create: async () => undefined },
      }),
  };

  const service = createTransactionsService(prisma);
  await service.voidTransaction(createUser('MANAGER'), 'txn-1', { reason: 'Salah unit dus' });
  assert.equal(restoredQty, 20);
});

test('Phase 8 BL-08-04: validateCart rejects parent variant (regression BL-07-01)', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: 'parent-1',
          name: 'Cat',
          price: { toString: () => '50000' },
          costPrice: { toString: () => '40000' },
          hasVariants: true,
          unitId: 'unit-1',
          moq: 1,
          orderStep: 1,
          unit: { id: 'unit-1', symbol: 'kaleng', name: 'Kaleng' },
          unitConversions: [],
          bundleDefinition: null,
        },
      ],
    },
    inventoryItem: { findMany: async () => [{ productId: 'parent-1', quantity: 5 }] },
  };
  const service = createTransactionsService(prisma);
  await assert.rejects(
    () =>
      service.validateCart(createUser(), {
        outletId: 'outlet-1',
        items: [{ productId: 'parent-1', quantity: 1 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});
