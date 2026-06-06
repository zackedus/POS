/** Default: 1 loyalty point per Rp 10.000 spent (after discount, before tax). */
export const DEFAULT_LOYALTY_EARN_RATE_IDR = 10_000;

export interface LoyaltyEarnConfig {
  enabled: boolean;
  earnRateIdr: number;
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
