import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearMobileOfflineForTests,
  countPendingMobileOffline,
  enqueueMobileOffline,
  listPendingMobileOffline,
} from './offline-queue';

test('mobile offline queue: enqueue and count pending', async () => {
  await clearMobileOfflineForTests();
  await enqueueMobileOffline({
    id: 'test-1',
    kind: 'checkout-cash',
    payload: { items: [{ productId: 'p1', quantity: 1 }], cashReceived: 10000 },
  });
  const count = await countPendingMobileOffline();
  assert.equal(count, 1);
  const pending = await listPendingMobileOffline();
  assert.equal(pending[0]?.kind, 'checkout-cash');
});
