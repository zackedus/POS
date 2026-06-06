import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { SyncService } from './sync.service';
import { SyncQueueProcessor } from './sync-queue.processor';

function createUser(): AuthJwtPayload {
  return {
    sub: 'cashier-1',
    email: 'cashier@barokah.test',
    tenantId: 'tenant-1',
    role: 'CASHIER',
    outletIds: ['outlet-1'],
  };
}

const productId = '11111111-1111-4111-8111-111111111111';

const cashPayload = {
  items: [{ productId, quantity: 1 }],
  cashReceived: 50000,
};

test('SCR-O01: enqueue creates pending entry and triggers replay dispatcher', async () => {
  const store = new Map<string, Record<string, unknown>>();
  const prisma = {
    syncQueueEntry: {
      findUnique: async ({ where }: { where: { outletId_clientRequestId: { clientRequestId: string } } }) => {
        const key = where.outletId_clientRequestId.clientRequestId;
        return store.get(key) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: 'sq-1',
          status: 'PENDING',
          transactionId: null,
          conflictCode: null,
          conflictMessage: null,
          ...data,
        };
        store.set(data.clientRequestId as string, row);
        return row;
      },
      groupBy: async () => [{ status: 'APPLIED', _count: { _all: 1 } }],
      findFirst: async () => ({ processedAt: new Date() }),
      count: async () => 0,
      findMany: async () => [],
    },
  };

  const dispatcher = {
    scheduleReplay: async () => {
      const row = store.get('offline-req-001');
      if (row) {
        store.set('offline-req-001', {
          ...row,
          status: 'APPLIED',
          transactionId: 'txn-offline-1',
          processedAt: new Date(),
        });
      }
      return { processor: 'inline-fallback' as const, replayedCount: 1 };
    },
    getProcessorLabel: () => 'inline-fallback' as const,
  };

  const service = new SyncService(prisma as never, dispatcher as never);
  const result = await service.enqueue(createUser(), {
    entries: [
      {
        clientRequestId: 'offline-req-001',
        operation: 'CHECKOUT_CASH',
        payload: cashPayload,
      },
    ],
  });

  assert.equal(result.replayedCount, 1);
  assert.equal(result.processor, 'inline-fallback');
  assert.equal(result.entries[0]?.status, 'APPLIED');
  assert.equal(result.entries[0]?.transactionId, 'txn-offline-1');
  assert.equal(result.entries[0]?.idempotentReplay, false);
});

test('SCR-O02: duplicate clientRequestId returns idempotent queue state', async () => {
  const existingRow = {
    id: 'sq-existing',
    status: 'APPLIED',
    transactionId: 'txn-existing',
    conflictCode: null,
    conflictMessage: null,
  };

  const prisma = {
    syncQueueEntry: {
      findUnique: async () => existingRow,
      create: async () => {
        throw new Error('create should not run for duplicate clientRequestId');
      },
      groupBy: async () => [],
      findFirst: async () => null,
      count: async () => 0,
      findMany: async () => [],
    },
  };

  const dispatcher = {
    scheduleReplay: async () => ({ processor: 'inline-fallback' as const, replayedCount: 0 }),
    getProcessorLabel: () => 'inline-fallback' as const,
  };
  const service = new SyncService(prisma as never, dispatcher as never);

  const result = await service.enqueue(createUser(), {
    entries: [
      {
        clientRequestId: 'offline-req-dup',
        operation: 'CHECKOUT_CASH',
        payload: cashPayload,
      },
    ],
  });

  assert.equal(result.entries[0]?.idempotentReplay, true);
  assert.equal(result.entries[0]?.transactionId, 'txn-existing');
});

test('SCR-O03: getStatus returns queue counts and pending total', async () => {
  const prisma = {
    syncQueueEntry: {
      groupBy: async () => [
        { status: 'PENDING', _count: { _all: 2 } },
        { status: 'CONFLICT', _count: { _all: 1 } },
        { status: 'APPLIED', _count: { _all: 5 } },
      ],
      findFirst: async () => ({ processedAt: new Date('2026-06-02T10:00:00Z') }),
    },
  };

  const dispatcher = {
    scheduleReplay: async () => ({ processor: 'inline-fallback' as const, replayedCount: 0 }),
    getProcessorLabel: () => 'inline-fallback' as const,
  };
  const service = new SyncService(prisma as never, dispatcher as never);
  const status = await service.getStatus(createUser(), {});

  assert.equal(status.queue.pending, 2);
  assert.equal(status.queue.conflict, 1);
  assert.equal(status.queue.applied, 5);
  assert.equal(status.pendingTotal, 2);
  assert.equal(status.conflictTotal, 1);
  assert.ok(status.lastProcessedAt);
});

test('SCR-O04: getConflicts lists CONFLICT entries for outlet', async () => {
  const prisma = {
    syncQueueEntry: {
      findMany: async () => [
        {
          id: 'sq-conflict-1',
          clientRequestId: 'offline-req-stock',
          operation: 'CHECKOUT_CASH',
          conflictCode: ErrorCodes.INSUFFICIENT_STOCK,
          conflictMessage: 'Stok produk tidak mencukupi.',
          deviceId: 'pwa-device-1',
          clientCreatedAt: new Date('2026-06-02T09:00:00Z'),
          processedAt: new Date('2026-06-02T09:01:00Z'),
          createdAt: new Date('2026-06-02T09:00:00Z'),
        },
      ],
      count: async () => 1,
    },
  };

  const dispatcher = {
    scheduleReplay: async () => ({ processor: 'inline-fallback' as const, replayedCount: 0 }),
    getProcessorLabel: () => 'inline-fallback' as const,
  };
  const service = new SyncService(prisma as never, dispatcher as never);
  const result = await service.getConflicts(createUser(), { limit: 10 });

  assert.equal(result.total, 1);
  assert.equal(result.conflicts[0]?.conflictCode, ErrorCodes.INSUFFICIENT_STOCK);
  assert.equal(result.conflicts[0]?.clientRequestId, 'offline-req-stock');
});

test('SCR-O05: processor marks CONFLICT on insufficient stock replay', async () => {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    syncQueueEntry: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
  };

  const transactionsService = {
    checkoutCash: async () => {
      const { ConflictException } = await import('@nestjs/common');
      throw new ConflictException({
        code: ErrorCodes.INSUFFICIENT_STOCK,
        message: 'Stok produk tidak mencukupi.',
      });
    },
  };

  const processor = new SyncQueueProcessor(prisma as never, transactionsService as never);
  const status = await processor.replayEntry(createUser(), {
    id: 'sq-1',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    clientRequestId: 'offline-req-stock',
    operation: 'CHECKOUT_CASH',
    payload: cashPayload,
  });

  assert.equal(status, 'CONFLICT');
  const finalUpdate = updates.at(-1);
  assert.equal(finalUpdate?.status, 'CONFLICT');
  assert.equal(finalUpdate?.conflictCode, ErrorCodes.INSUFFICIENT_STOCK);
});

test('SCR-O06: processor replays checkout idempotently when transaction exists', async () => {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    syncQueueEntry: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
  };

  const transactionsService = {
    checkoutCash: async () => ({
      id: 'txn-replay-existing',
      receiptNo: 'TRX-EXISTING',
    }),
  };

  const processor = new SyncQueueProcessor(prisma as never, transactionsService as never);
  const status = await processor.replayEntry(createUser(), {
    id: 'sq-2',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    clientRequestId: 'offline-req-existing-txn',
    operation: 'CHECKOUT_CASH',
    payload: { ...cashPayload, clientRequestId: 'offline-req-existing-txn' },
  });

  assert.equal(status, 'APPLIED');
  assert.equal(updates.at(-1)?.transactionId, 'txn-replay-existing');
});
