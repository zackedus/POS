import { ErrorCodes } from '@barokah/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchSyncConflicts,
  getConflictActions,
  getConflictUserMessage,
  recordConflictResolution,
} from './sync-conflicts';

const authFetchMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

describe('sync-conflicts', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    window.localStorage.clear();
  });

  it('maps INSUFFICIENT_STOCK to Indonesian copy', () => {
    expect(getConflictUserMessage(ErrorCodes.INSUFFICIENT_STOCK)).toMatch(/Stok tidak mencukupi/i);
    expect(getConflictActions(ErrorCodes.INSUFFICIENT_STOCK)).toContain('ADJUST_QTY');
  });

  it('fetches conflicts from GET /sync/conflicts', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          outletId: 'outlet-1',
          total: 1,
          conflicts: [
            {
              id: 'sq-1',
              clientRequestId: 'req-1',
              operation: 'CHECKOUT_CASH',
              conflictCode: ErrorCodes.INSUFFICIENT_STOCK,
              conflictMessage: 'Stok habis',
              deviceId: null,
              clientCreatedAt: null,
              processedAt: null,
              queuedAt: '2026-06-02T10:00:00.000Z',
            },
          ],
        },
      }),
    });

    const data = await fetchSyncConflicts(10);
    expect(data.total).toBe(1);
    expect(authFetchMock).toHaveBeenCalledWith(expect.stringContaining('/sync/conflicts'));
  });

  it('records resolution in localStorage audit trail', () => {
    recordConflictResolution('sq-1', 'CANCEL', 'kasir batalkan');
    const raw = window.localStorage.getItem('barokah-pos-conflict-resolutions');
    expect(raw).toBeTruthy();
    const list = JSON.parse(raw as string) as Array<{ resolution: string }>;
    expect(list[0]?.resolution).toBe('CANCEL');
  });
});
