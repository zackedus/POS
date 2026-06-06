import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MockQrisProvider } from './qris-provider.interface';

test('MockQrisProvider: generates stable mock payload', () => {
  const provider = new MockQrisProvider();
  const result = provider.initiate({
    paymentId: 'QRIS-TEST-1',
    amount: 150000,
    clientRequestId: 'req-1',
  });
  assert.equal(provider.providerId, 'mock');
  assert.match(result.qrPayload, /ID\.QRIS\.MOCK\|QRIS-TEST-1\|150000/);
  assert.equal(result.status, 'PENDING');
});
