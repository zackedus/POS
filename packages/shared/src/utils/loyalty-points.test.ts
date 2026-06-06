import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLoyaltyPointsEarned,
  computeLoyaltyRedeemDiscount,
  DEFAULT_LOYALTY_EARN_RATE_IDR,
  DEFAULT_LOYALTY_REDEEM_MAX_PERCENT,
  DEFAULT_LOYALTY_REDEEM_VALUE_IDR,
  previewLoyaltyPointsEarned,
  previewLoyaltyRedeemDiscount,
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

test('computeLoyaltyRedeemDiscount: 1 point = Rp 1.000', () => {
  const result = computeLoyaltyRedeemDiscount({
    pointsRequested: 5,
    customerBalance: 10,
    netAfterPromoIdr: 100_000,
    config: {
      enabled: true,
      pointValueIdr: DEFAULT_LOYALTY_REDEEM_VALUE_IDR,
      maxPercentOfNet: DEFAULT_LOYALTY_REDEEM_MAX_PERCENT,
    },
  });
  assert.equal(result.pointsRedeemed, 5);
  assert.equal(result.discountIdr, 5_000);
});

test('computeLoyaltyRedeemDiscount: caps at max percent of net', () => {
  const result = computeLoyaltyRedeemDiscount({
    pointsRequested: 100,
    customerBalance: 100,
    netAfterPromoIdr: 100_000,
    config: {
      enabled: true,
      pointValueIdr: 1_000,
      maxPercentOfNet: 50,
    },
  });
  assert.equal(result.discountIdr, 50_000);
  assert.equal(result.pointsRedeemed, 50);
});

test('computeLoyaltyRedeemDiscount: cannot exceed customer balance', () => {
  const result = computeLoyaltyRedeemDiscount({
    pointsRequested: 20,
    customerBalance: 3,
    netAfterPromoIdr: 100_000,
    config: {
      enabled: true,
      pointValueIdr: 1_000,
      maxPercentOfNet: 50,
    },
  });
  assert.equal(result.pointsRedeemed, 3);
  assert.equal(result.discountIdr, 3_000);
});

test('previewLoyaltyRedeemDiscount applies promo discount first', () => {
  const result = previewLoyaltyRedeemDiscount(10, 10, 100_000, 20_000, {
    enabled: true,
    pointValueIdr: 1_000,
    maxPercentOfNet: 50,
  });
  // net after promo = 80k, max 50% = 40k, 10 points = 10k
  assert.equal(result.discountIdr, 10_000);
  assert.equal(result.pointsRedeemed, 10);
});
