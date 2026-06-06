import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncOfflineQueue, syncOfflineQueueEntry } from './offline-sync';

const authFetchMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

vi.mock('@/lib/offline-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/offline-queue')>();
  return {
    ...actual,
    listPendingOfflineTransactions: vi.fn(),
    updateOfflineQueueEntry: vi.fn(),
    removeOfflineQueueEntry: vi.fn(),
  };
});

import {
  listPendingOfflineTransactions,
  removeOfflineQueueEntry,
  updateOfflineQueueEntry,
} from '@/lib/offline-queue';

function mockSyncApplied(clientRequestId: string, transactionId = 'txn-1') {
  authFetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        outletId: 'outlet-1',
        processor: 'in-process-stub',
        replayedCount: 1,
        entries: [
          {
            clientRequestId,
            status: 'APPLIED',
            transactionId,
            conflictCode: null,
            conflictMessage: null,
            idempotentReplay: false,
          },
        ],
      },
    }),
  });
}

describe('offline-sync', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    vi.mocked(listPendingOfflineTransactions).mockReset();
    vi.mocked(updateOfflineQueueEntry).mockReset();
    vi.mocked(removeOfflineQueueEntry).mockReset();
  });

  it('syncs checkout-cash entry via POST /sync/queue and removes from queue', async () => {
    mockSyncApplied('req-1');

    const entry = {
      id: 'req-1',
      kind: 'checkout-cash' as const,
      payload: {
        clientRequestId: 'req-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        cashReceived: 10000,
      },
      status: 'pending' as const,
      createdAt: '2026-06-02T10:00:00.000Z',
      attemptCount: 0,
    };

    const result = await syncOfflineQueueEntry(entry);

    expect(result.ok).toBe(true);
    expect(result.transactionId).toBe('txn-1');
    expect(removeOfflineQueueEntry).toHaveBeenCalledWith('req-1');
    expect(authFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/sync/queue'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('CHECKOUT_CASH'),
      }),
    );
  });

  it('marks entry failed when sync API returns CONFLICT', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          outletId: 'outlet-1',
          processor: 'in-process-stub',
          replayedCount: 0,
          entries: [
            {
              clientRequestId: 'req-2',
              status: 'CONFLICT',
              transactionId: null,
              conflictCode: 'SHIFT_NOT_OPEN',
              conflictMessage: 'Shift belum dibuka.',
              idempotentReplay: false,
            },
          ],
        },
      }),
    });

    const entry = {
      id: 'req-2',
      kind: 'checkout-split' as const,
      payload: {
        clientRequestId: 'req-2',
        items: [{ productId: 'prod-1', quantity: 1 }],
        payments: [
          { method: 'CASH', amount: 5000 },
          { method: 'TRANSFER', amount: 5000 },
        ],
      },
      status: 'pending' as const,
      createdAt: '2026-06-02T10:00:00.000Z',
      attemptCount: 0,
    };

    const result = await syncOfflineQueueEntry(entry);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('SHIFT_NOT_OPEN');
    expect(updateOfflineQueueEntry).toHaveBeenCalledWith(
      'req-2',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('marks entry failed when API returns error envelope', async () => {
    authFetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { code: 'VALIDATION_FAILED', message: 'Payload tidak valid.' },
      }),
    });

    const entry = {
      id: 'req-3',
      kind: 'checkout-cash' as const,
      payload: {
        clientRequestId: 'req-3',
        items: [{ productId: 'prod-1', quantity: 1 }],
        cashReceived: 1000,
      },
      status: 'pending' as const,
      createdAt: '2026-06-02T10:00:00.000Z',
      attemptCount: 0,
    };

    const result = await syncOfflineQueueEntry(entry);

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
    expect(updateOfflineQueueEntry).toHaveBeenCalledWith(
      'req-3',
      expect.objectContaining({ status: 'failed' }),
    );
  });

  it('syncOfflineQueue processes all pending entries', async () => {
    vi.mocked(listPendingOfflineTransactions).mockResolvedValue([
      {
        id: 'req-a',
        kind: 'checkout-cash',
        payload: {
          clientRequestId: 'req-a',
          items: [{ productId: 'p1', quantity: 1 }],
          cashReceived: 1000,
        },
        status: 'pending',
        createdAt: '2026-06-02T10:00:00.000Z',
        attemptCount: 0,
      },
    ]);

    mockSyncApplied('req-a', 'txn-a');

    const summary = await syncOfflineQueue();
    expect(summary.synced).toHaveLength(1);
    expect(summary.failed).toHaveLength(0);
  });
});
