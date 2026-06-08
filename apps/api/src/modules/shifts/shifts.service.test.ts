import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ShiftsService } from './shifts.service';

function createUser(role: UserRole): AuthJwtPayload {
  return {
    sub: 'user-1',
    email: 'cashier@barokah.test',
    tenantId: 'tenant-1',
    role,
    outletIds: ['outlet-1'],
  };
}

test('SCR-S02: openShift throws SHIFT_ALREADY_OPEN when shift is active', async () => {
  const prisma = {
    shift: {
      findFirst: async () => ({ id: 'shift-open-1' }),
      create: async () => {
        throw new Error('create should not be called when shift is active');
      },
    },
  };

  const service = new ShiftsService(prisma as never);

  await assert.rejects(
    () =>
      service.openShift(createUser(UserRole.CASHIER), {
        outletId: 'outlet-1',
        openingCash: 100_000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.SHIFT_ALREADY_OPEN);
      return true;
    },
  );
});

test('SCR-S03: cashier can close active shift with cash reconciliation', async () => {
  const now = new Date('2026-06-02T17:00:00.000Z');
  const baseShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    cashierId: 'user-1',
    openingCash: '100000',
    openedAt: new Date('2026-06-02T08:00:00.000Z'),
    closedAt: null,
    outlet: { tenantId: 'tenant-1' },
    transactions: [
      {
        status: 'COMPLETED',
        total: '150000',
        payments: [{ method: 'CASH', amount: '200000' }],
      },
    ],
  };

  let updatedData: Record<string, unknown> | null = null;
  const prisma = {
    shift: {
      findUnique: async () => baseShift,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updatedData = data;
        return {
          ...baseShift,
          closingCash: data.closingCash,
          expectedCash: data.expectedCash,
          difference: data.difference,
          closedAt: now,
        };
      },
    },
    receivablePayment: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
  };

  const service = new ShiftsService(prisma as never);
  const result = await service.closeShift(createUser(UserRole.CASHIER), 'shift-1', {
    closingCash: 260_000,
  });

  assert.equal(result.id, 'shift-1');
  assert.equal(result.openingCash, 100_000);
  assert.equal(result.expectedCash, 250_000);
  assert.equal(result.closingCash, 260_000);
  assert.equal(result.difference, 10_000);
  assert.ok(result.closedAt instanceof Date);
  assert.ok(updatedData);
});

test('SCR-S02: manager can force-close active shift', async () => {
  const now = new Date('2026-06-02T08:00:00.000Z');
  const baseShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    openingCash: '100000',
    openedAt: new Date('2026-06-02T00:00:00.000Z'),
    closedAt: null,
  };

  let auditLogCreated = false;
  const prisma = {
    shift: {
      findUnique: async () => ({
        ...baseShift,
        outlet: { tenantId: 'tenant-1' },
      }),
    },
    $transaction: async (handler: (tx: unknown) => Promise<unknown>) =>
      handler({
        shift: {
          update: async () => ({
            ...baseShift,
            closedAt: now,
          }),
        },
        auditLog: {
          create: async () => {
            auditLogCreated = true;
          },
        },
      }),
  };

  const service = new ShiftsService(prisma as never);
  const result = await service.forceCloseShift(
    createUser(UserRole.MANAGER),
    'shift-1',
    { reason: ' Manager resolved conflict ' },
  );

  assert.equal(result.id, 'shift-1');
  assert.equal(result.forceClosed, true);
  assert.equal(result.forceClosedBy, 'user-1');
  assert.equal(result.reason, 'Manager resolved conflict');
  assert.ok(result.closedAt instanceof Date);
  assert.equal(auditLogCreated, true);
});

test('Phase 8: close preview includes active held transaction count', async () => {
  const baseShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    cashierId: 'user-1',
    openingCash: '100000',
    openedAt: new Date('2026-06-02T08:00:00.000Z'),
    closedAt: null,
    outlet: { tenantId: 'tenant-1' },
    transactions: [],
  };

  const prisma = {
    shift: {
      findUnique: async () => baseShift,
    },
    heldTransaction: {
      count: async () => 2,
    },
    receivablePayment: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
  };

  const service = new ShiftsService(prisma as never);
  const preview = await service.getClosePreview(createUser(UserRole.CASHIER), 'shift-1');

  assert.equal(preview.heldCount, 2);
  assert.match(preview.heldWarning ?? '', /hold/i);
});

test('SCR-S02: cashier cannot force-close shift (RBAC hardening)', async () => {
  const prisma = {
    shift: {
      findUnique: async () => {
        throw new Error('findUnique should not be called for cashier role');
      },
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called for cashier role');
    },
  };

  const service = new ShiftsService(prisma as never);

  await assert.rejects(
    () =>
      service.forceCloseShift(createUser(UserRole.CASHIER), 'shift-1', {
        reason: 'Not allowed',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_PERMISSION);
      return true;
    },
  );
});

test('SCR-S02: manager force-close throws SHIFT_ALREADY_CLOSED for closed shift', async () => {
  const prisma = {
    shift: {
      findUnique: async () => ({
        id: 'shift-closed-1',
        outletId: 'outlet-1',
        outlet: { tenantId: 'tenant-1' },
        closedAt: new Date('2026-06-02T09:00:00.000Z'),
      }),
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called when shift already closed');
    },
  };

  const service = new ShiftsService(prisma as never);

  await assert.rejects(
    () =>
      service.forceCloseShift(createUser(UserRole.MANAGER), 'shift-closed-1', {
        reason: 'Duplicate force-close',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.SHIFT_ALREADY_CLOSED);
      return true;
    },
  );
});

test('Shifts: getClosePreview returns expected cash before close', async () => {
  const baseShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    cashierId: 'user-1',
    openingCash: '100000',
    openedAt: new Date('2026-06-02T08:00:00.000Z'),
    closedAt: null,
    outlet: { tenantId: 'tenant-1' },
    transactions: [
      {
        status: 'COMPLETED',
        total: '150000',
        payments: [{ method: 'CASH', amount: '150000' }],
      },
    ],
  };

  const prisma = {
    shift: {
      findUnique: async () => baseShift,
    },
    heldTransaction: {
      count: async () => 0,
    },
    receivablePayment: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
  };

  const service = new ShiftsService(prisma as never);
  const preview = await service.getClosePreview(createUser(UserRole.CASHIER), 'shift-1');
  assert.equal(preview.openingCash, 100_000);
  assert.equal(preview.cashSales, 150_000);
  assert.equal(preview.expectedCash, 250_000);
  assert.equal(preview.transactionCount, 1);
  assert.equal(preview.heldCount, 0);
});

test('Shifts: expected cash includes AR collections and subtracts expenses', async () => {
  const baseShift = {
    id: 'shift-1',
    outletId: 'outlet-1',
    cashierId: 'user-1',
    openingCash: '100000',
    openedAt: new Date('2026-06-02T08:00:00.000Z'),
    closedAt: null,
    outlet: { tenantId: 'tenant-1' },
    transactions: [
      {
        status: 'COMPLETED',
        total: '50000',
        payments: [{ method: 'CASH', amount: '50000' }],
      },
    ],
  };

  const prisma = {
    shift: {
      findUnique: async () => baseShift,
    },
    heldTransaction: {
      count: async () => 0,
    },
    receivablePayment: {
      aggregate: async () => ({ _sum: { amount: '75000' } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: '20000' } }),
    },
  };

  const service = new ShiftsService(prisma as never);
  const preview = await service.getClosePreview(createUser(UserRole.CASHIER), 'shift-1');
  assert.equal(preview.cashSales, 50_000);
  assert.equal(preview.arCashCollections, 75_000);
  assert.equal(preview.cashExpenses, 20_000);
  assert.equal(preview.expectedCash, 205_000);
});
