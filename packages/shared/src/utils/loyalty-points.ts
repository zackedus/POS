/** Default: 1 loyalty point per Rp 10.000 spent (after discount, before tax). */
export const DEFAULT_LOYALTY_EARN_RATE_IDR = 10_000;
/** Default: 1 point redeems Rp 1.000 discount at checkout. */
export const DEFAULT_LOYALTY_REDEEM_VALUE_IDR = 1_000;
/** Default cap: redeem discount max 50% of net subtotal after promo. */
export const DEFAULT_LOYALTY_REDEEM_MAX_PERCENT = 50;

export interface LoyaltyEarnConfig {
  enabled: boolean;
  earnRateIdr: number;
}

export interface LoyaltyRedeemConfig {
  enabled: boolean;
  pointValueIdr: number;
  maxPercentOfNet: number;
}

export interface LoyaltyRedeemResult {
  pointsRedeemed: number;
  discountIdr: number;
}

export function computeLoyaltyPointsEarned(
  netSpendIdr: number,
  config: LoyaltyEarnConfig,
): number {
  if (!config.enabled || netSpendIdr <= 0 || config.earnRateIdr <= 0) {
    return 0;
  }
  return Math.floor(netSpendIdr / config.earnRateIdr);
}

/** Preview for POS cart — uses subtotal minus discount (pre-tax). */
export function previewLoyaltyPointsEarned(
  subtotalIdr: number,
  discountIdr: number,
  config: LoyaltyEarnConfig,
): number {
  const net = Math.max(0, subtotalIdr - discountIdr);
  return computeLoyaltyPointsEarned(net, config);
}

/** Compute redeem discount from requested points — caps by balance, max %, and net subtotal. */
export function computeLoyaltyRedeemDiscount(params: {
  pointsRequested: number;
  customerBalance: number;
  netAfterPromoIdr: number;
  config: LoyaltyRedeemConfig;
}): LoyaltyRedeemResult {
  const { pointsRequested, customerBalance, netAfterPromoIdr, config } = params;
  if (
    !config.enabled ||
    pointsRequested <= 0 ||
    netAfterPromoIdr <= 0 ||
    customerBalance <= 0 ||
    config.pointValueIdr <= 0
  ) {
    return { pointsRedeemed: 0, discountIdr: 0 };
  }

  const cappedPoints = Math.min(pointsRequested, customerBalance);
  const maxDiscountByPercent = Math.floor(
    netAfterPromoIdr * (Math.min(100, Math.max(0, config.maxPercentOfNet)) / 100),
  );
  const rawDiscount = cappedPoints * config.pointValueIdr;
  const discountIdr = Math.min(rawDiscount, maxDiscountByPercent, netAfterPromoIdr);
  const pointsRedeemed = Math.floor(discountIdr / config.pointValueIdr);

  return {
    pointsRedeemed,
    discountIdr: pointsRedeemed * config.pointValueIdr,
  };
}

/** POS preview — same rules as checkout redeem. */
export function previewLoyaltyRedeemDiscount(
  pointsRequested: number,
  customerBalance: number,
  subtotalIdr: number,
  promoDiscountIdr: number,
  config: LoyaltyRedeemConfig,
): LoyaltyRedeemResult {
  const netAfterPromo = Math.max(0, subtotalIdr - promoDiscountIdr);
  return computeLoyaltyRedeemDiscount({
    pointsRequested,
    customerBalance,
    netAfterPromoIdr: netAfterPromo,
    config,
  });
}
