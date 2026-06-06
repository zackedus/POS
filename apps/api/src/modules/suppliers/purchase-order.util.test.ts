import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPurchaseOrderNo, toDateKey } from './purchase-order.util';

test('PurchaseOrder util: buildPurchaseOrderNo pads sequence', () => {
  assert.equal(buildPurchaseOrderNo('2026-06-02', 1), 'PO-20260602-0001');
  assert.equal(buildPurchaseOrderNo('2026-06-02', 42), 'PO-20260602-0042');
});

test('PurchaseOrder util: toDateKey returns YYYY-MM-DD', () => {
  assert.equal(toDateKey(new Date('2026-06-02T15:30:00.000Z')), '2026-06-02');
});
