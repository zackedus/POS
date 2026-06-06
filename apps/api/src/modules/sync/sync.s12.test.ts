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

test('SCR-S12-01: enqueue uses bullmq dispatcher label when configured', async () => {
  const store = new Map<string, Record<string, unknown>>();
  const prisma = {
    syncQueueEntry: {
      findUnique: async ({ where }: { where: { outletId_clientRequestId: { clientRequestId: string } } }) => {
        const key = where.outletId_clientRequestId.clientRequestId;
        return store.get(key) ?? null;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: 'sq-s12-1',
          status: 'PENDING',
          transactionId: null,
          conflictCode: null,
          conflictMessage: null,
          ...data,
        };
        store.set(data.clientRequestId as string, row);
        return row;
      },
    },
  };

  const dispatcher = {
    scheduleReplay: async () => {
      const row = store.get('offline-hold-001');
      if (row) {
        store.set('offline-hold-001', {
          ...row,
          status: 'APPLIED',
          transactionId: 'held-offline-1',
        });
      }
      return { processor: 'bullmq' as const, replayedCount: 1 };
    },
    getProcessorLabel: () => 'bullmq' as const,
  };

  const service = new SyncService(prisma as never, dispatcher as never);
  const result = await service.enqueue(createUser(), {
    entries: [
      {
        clientRequestId: 'offline-hold-001',
        operation: 'HOLD_BILL',
        payload: {
          items: [{ productId, quantity: 2 }],
          label: 'Hold offline',
        },
      },
    ],
  });

  assert.equal(result.processor, 'bullmq');
  assert.equal(result.replayedCount, 1);
  assert.equal(result.entries[0]?.status, 'APPLIED');
  assert.equal(result.entries[0]?.transactionId, 'held-offline-1');
});

test('SCR-S12-02: processor replays HOLD_BILL and stores held id', async () => {
  const updates: Array<Record<string, unknown>> = [];
  let holdClientRequestId: string | undefined;
  const prisma = {
    syncQueueEntry: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
  };

  const transactionsService = {
    holdTransaction: async (_user: unknown, dto: { clientRequestId?: string }) => {
      holdClientRequestId = dto.clientRequestId;
      return {
        id: 'held-s12-abc',
        label: 'Hold A',
        total: 10000,
        expiresAt: new Date(),
        itemCount: 1,
        items: [],
        idempotentReplay: false,
      };
    },
  };

  const processor = new SyncQueueProcessor(prisma as never, transactionsService as never);
  const status = await processor.replayEntry(createUser(), {
    id: 'sq-hold',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    clientRequestId: 'offline-hold-req',
    operation: 'HOLD_BILL',
    payload: {
      items: [{ productId, quantity: 1 }],
      label: 'Meja 1',
    },
  });

  assert.equal(status, 'APPLIED');
  assert.equal(updates.at(-1)?.transactionId, 'held-s12-abc');
  assert.equal(holdClientRequestId, 'offline-hold-req');
});

test('SCR-S12-03: processor replays RECALL_HOLD', async () => {
  const updates: Array<Record<string, unknown>> = [];
  let recalledId: string | null = null;
  const prisma = {
    syncQueueEntry: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return data;
      },
    },
  };

  const transactionsService = {
    recallHeldTransaction: async (_user: AuthJwtPayload, heldId: string) => {
      recalledId = heldId;
      return {
        id: heldId,
        label: 'Hold A',
        total: 10000,
        items: [{ productId, name: 'Semen', price: 10000, quantity: 1 }],
      };
    },
  };

  const processor = new SyncQueueProcessor(prisma as never, transactionsService as never);
  const status = await processor.replayEntry(createUser(), {
    id: 'sq-recall',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    clientRequestId: 'offline-recall-req',
    operation: 'RECALL_HOLD',
    payload: { heldId: 'held-s12-abc' },
  });

  assert.equal(status, 'APPLIED');
  assert.equal(recalledId, 'held-s12-abc');
  assert.equal(updates.at(-1)?.transactionId, 'held-s12-abc');
});

test('SCR-S12-04: processor marks CONFLICT on recall stock failure', async () => {
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
    recallHeldTransaction: async () => {
      const { ConflictException } = await import('@nestjs/common');
      throw new ConflictException({
        code: ErrorCodes.INSUFFICIENT_STOCK,
        message: 'Recall gagal. Stok produk berubah.',
      });
    },
  };

  const processor = new SyncQueueProcessor(prisma as never, transactionsService as never);
  const status = await processor.replayEntry(createUser(), {
    id: 'sq-recall-conflict',
    outletId: 'outlet-1',
    cashierId: 'cashier-1',
    clientRequestId: 'offline-recall-stock',
    operation: 'RECALL_HOLD',
    payload: { heldId: 'held-missing-stock' },
  });

  assert.equal(status, 'CONFLICT');
  assert.equal(updates.at(-1)?.conflictCode, ErrorCodes.INSUFFICIENT_STOCK);
});

test('SCR-S12-05: getStatus reports bullmq processor label from dispatcher', async () => {
  const prisma = {
    syncQueueEntry: {
      groupBy: async () => [{ status: 'PENDING', _count: { _all: 1 } }],
      findFirst: async () => null,
    },
  };

  const dispatcher = {
    scheduleReplay: async () => ({ processor: 'bullmq' as const, replayedCount: 0 }),
    getProcessorLabel: () => 'bullmq' as const,
    getQueueMetrics: async () => ({
      waiting: 0,
      active: 1,
      failed: 2,
      completed: 10,
    }),
  };

  const service = new SyncService(prisma as never, dispatcher as never);
  const status = await service.getStatus(createUser(), {});

  assert.equal(status.processor, 'bullmq');
  assert.equal(status.pendingTotal, 1);
  assert.deepEqual(status.bullmq, { waiting: 0, active: 1, failed: 2, completed: 10 });
});
