import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ONLINE_COD_DEPOSIT_RATE,
  buildOnlineCodPaymentSummary,
  calculateOnlineCodSplit,
  formatOnlineCodPaymentLabel,
  resolveOnlineOrderChargeAmount,
} from './online-cod';

test('calculateOnlineCodSplit uses 20% rounded deposit and remainder balance', () => {
  assert.equal(ONLINE_COD_DEPOSIT_RATE, 0.2);
  assert.deepEqual(calculateOnlineCodSplit(100_000), { depositAmount: 20_000, balanceDue: 80_000 });
  assert.deepEqual(calculateOnlineCodSplit(155_555), { depositAmount: 31_111, balanceDue: 124_444 });
});

test('resolveOnlineOrderChargeAmount returns deposit for COD orders', () => {
  assert.equal(resolveOnlineOrderChargeAmount('FULL_ONLINE', 500_000, null), 500_000);
  assert.equal(resolveOnlineOrderChargeAmount('COD', 500_000, 100_000), 100_000);
  assert.equal(resolveOnlineOrderChargeAmount('COD', 500_000, null), 100_000);
});

test('buildOnlineCodPaymentSummary tracks amount to collect until collected', () => {
  const pending = buildOnlineCodPaymentSummary({
    orderTotal: 200_000,
    depositAmount: 40_000,
    balanceDue: 160_000,
    balanceCollectedAt: null,
  });
  assert.equal(pending.amountToCollect, 160_000);
  assert.equal(pending.balanceCollectedAt, null);

  const collected = buildOnlineCodPaymentSummary({
    orderTotal: 200_000,
    depositAmount: 40_000,
    balanceDue: 160_000,
    balanceCollectedAt: new Date('2026-06-09T10:00:00.000Z'),
  });
  assert.equal(collected.amountToCollect, 0);
  assert.ok(collected.balanceCollectedAt);
});

test('formatOnlineCodPaymentLabel describes deposit and balance', () => {
  const label = formatOnlineCodPaymentLabel({
    depositAmount: 50_000,
    balanceDue: 200_000,
    balanceCollectedAt: null,
  });
  assert.match(label, /COD/);
  assert.match(label, /50/);
  assert.match(label, /200/);
});
