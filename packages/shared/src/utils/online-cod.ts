/** COD webstore: customer pays 20% deposit upfront, 80% on delivery (IDR integer rounding). */
export const ONLINE_COD_DEPOSIT_RATE = 0.2;

export function calculateOnlineCodSplit(total: number): { depositAmount: number; balanceDue: number } {
  const depositAmount = Math.round(total * ONLINE_COD_DEPOSIT_RATE);
  const balanceDue = total - depositAmount;
  return { depositAmount, balanceDue };
}

export function resolveOnlineOrderChargeAmount(
  paymentMode: 'FULL_ONLINE' | 'COD',
  total: number,
  depositAmount: number | null | undefined,
): number {
  if (paymentMode === 'COD') {
    return depositAmount ?? calculateOnlineCodSplit(total).depositAmount;
  }
  return total;
}

export type OnlineCodPaymentSummary = {
  paymentMode: 'COD';
  orderTotal: number;
  depositAmount: number;
  balanceDue: number;
  balanceCollectedAt: string | null;
  amountToCollect: number;
};

export function buildOnlineCodPaymentSummary(input: {
  orderTotal: number;
  depositAmount: number;
  balanceDue: number;
  balanceCollectedAt?: Date | string | null;
}): OnlineCodPaymentSummary {
  const collected =
    input.balanceCollectedAt != null && String(input.balanceCollectedAt).length > 0;
  return {
    paymentMode: 'COD',
    orderTotal: input.orderTotal,
    depositAmount: input.depositAmount,
    balanceDue: input.balanceDue,
    balanceCollectedAt: collected
      ? typeof input.balanceCollectedAt === 'string'
        ? input.balanceCollectedAt
        : input.balanceCollectedAt!.toISOString()
      : null,
    amountToCollect: collected ? 0 : input.balanceDue,
  };
}

export function formatOnlineCodPaymentLabel(summary: {
  depositAmount: number;
  balanceDue: number;
  balanceCollectedAt?: string | null;
}): string {
  const deposit = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(summary.depositAmount);
  const balance = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(summary.balanceDue);
  if (summary.balanceCollectedAt) {
    return `COD · Lunas (dp ${deposit})`;
  }
  return `COD · Dp ${deposit} · Tagih ${balance}`;
}
