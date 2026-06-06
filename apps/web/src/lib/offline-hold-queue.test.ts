import { afterEach, describe, expect, it, vi } from 'vitest';
import { installOfflineIndexedDbMock } from '@/lib/test-indexeddb';
import {
  clearOfflineHoldQueueForTests,
  countPendingOfflineHolds,
  enqueueOfflineHold,
} from './offline-hold-queue';

describe('offline-hold-queue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('enqueues hold with sellUnitId and counts pending', async () => {
    installOfflineIndexedDbMock();
    await enqueueOfflineHold({
      items: [{ productId: 'prod-seng', quantity: 1, sellUnitId: 'unit-roll' }],
      label: 'Hold roll',
    });

    expect(await countPendingOfflineHolds()).toBe(1);
    await clearOfflineHoldQueueForTests();
    expect(await countPendingOfflineHolds()).toBe(0);
  });
});
