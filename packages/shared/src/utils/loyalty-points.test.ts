import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLoyaltyPointsEarned,
  DEFAULT_LOYALTY_EARN_RATE_IDR,
  previewLoyaltyPointsEarned,
} from './loyalty-points';

test('computeLoyaltyPointsEarned: 1 point per 10k IDR', () => {
  assert.equal(
    computeLoyaltyPointsEarned(25_000, { enabled: true, earnRateIdr: DEFAULT_LOYALTY_EARN_RATE_IDR }),
    2,
  );
  assert.equal(
    computeLoyaltyPointsEarned(9_999, { enabled: true, earnRateIdr: DEFAULT_LOYALTY_EARN_RATE_IDR }),
    0,
  );
});

test('computeLoyaltyPointsEarned: disabled returns 0', () => {
  assert.equal(
    computeLoyaltyPointsEarned(100_000, { enabled: false, earnRateIdr: DEFAULT_LOYALTY_EARN_RATE_IDR }),
    0,
  );
});

test('previewLoyaltyPointsEarned uses subtotal minus discount', () => {
  assert.equal(
    previewLoyaltyPointsEarned(50_000, 10_000, { enabled: true, earnRateIdr: 10_000 }),
    4,
  );
});
