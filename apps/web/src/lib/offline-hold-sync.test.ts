import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncOfflineHoldEntry } from './offline-hold-sync';

const authFetchMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

vi.mock('@/lib/offline-hold-queue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/offline-hold-queue')>();
  return {
    ...actual,
    updateOfflineHoldEntry: vi.fn(),
    removeOfflineHoldEntry: vi.fn(),
  };
});

import { removeOfflineHoldEntry } from '@/lib/offline-hold-queue';

describe('offline-hold-sync', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    vi.mocked(removeOfflineHoldEntry).mockReset();
  });

  it('syncs hold via POST /transactions/hold and removes queue entry', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'held-1' } }),
    });

    const entry = {
      id: 'hold-req-1',
      payload: {
        clientRequestId: 'hold-req-1',
        items: [{ productId: 'p1', quantity: 1, sellUnitId: 'unit-roll' }],
        label: 'Hold',
      },
      status: 'pending' as const,
      createdAt: '2026-06-02T10:00:00.000Z',
      attemptCount: 0,
    };

    const result = await syncOfflineHoldEntry(entry);
    expect(result.ok).toBe(true);
    expect(removeOfflineHoldEntry).toHaveBeenCalledWith('hold-req-1');
    expect(authFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/hold'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: 'p1', quantity: 1, sellUnitId: 'unit-roll' }],
          label: 'Hold',
          clientRequestId: 'hold-req-1',
        }),
      }),
    );
  });

  it('AUD-MU-03: syncs offline hold with multi-unit sellUnitId (automated)', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 'held-mu-1' } }),
    });

    const entry = {
      id: 'hold-mu-req',
      payload: {
        clientRequestId: 'hold-mu-req',
        items: [
          { productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' },
          { productId: 'prod-paku', quantity: 2.5, sellUnitId: 'unit-kg' },
        ],
        label: 'Hold multi-unit offline',
      },
      status: 'pending' as const,
      createdAt: '2026-06-06T10:00:00.000Z',
      attemptCount: 0,
    };

    const result = await syncOfflineHoldEntry(entry);
    expect(result.ok).toBe(true);
    expect(authFetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/transactions/hold'),
      expect.objectContaining({
        body: expect.stringContaining('unit-roll'),
      }),
    );
    const body = JSON.parse(String(authFetchMock.mock.calls[0]?.[1]?.body)) as {
      items: Array<{ sellUnitId?: string }>;
    };
    expect(body.items).toHaveLength(2);
    expect(body.items[1]?.sellUnitId).toBe('unit-kg');
  });
});
