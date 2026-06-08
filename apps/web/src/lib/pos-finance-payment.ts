import type { PaymentMode } from '@/components/pos/pos-types';

export const FINANCE_CUSTOMER_REQUIRED_MESSAGE =
  'Pilih pelanggan terlebih dahulu untuk bayar tempo/deposit';

/** Credit utilization above this ratio shows amber warning in finance panel. */
export const CREDIT_NEAR_LIMIT_RATIO = 0.8;

export type CreditLimitStatus = 'ok' | 'warning' | 'over';

export function isFinancePaymentMode(mode: PaymentMode | string): boolean {
  return mode === 'CREDIT' || mode === 'DEPOSIT';
}

export function isCustomerLinkedForFinance(customerId: string | null | undefined): boolean {
  return typeof customerId === 'string' && customerId.trim().length > 0;
}

export function canSelectFinancePaymentMode(
  mode: PaymentMode,
  customerId: string | null | undefined,
): boolean {
  if (!isFinancePaymentMode(mode)) {
    return true;
  }
  return isCustomerLinkedForFinance(customerId);
}

/** @deprecated Finance buttons stay clickable — use needsCustomerPickerForFinance instead. */
export function isFinancePaymentButtonDisabled(
  _mode: PaymentMode,
  _customerId: string | null | undefined,
): boolean {
  return false;
}

export function needsCustomerPickerForFinance(
  mode: PaymentMode,
  customerId: string | null | undefined,
): boolean {
  return isFinancePaymentMode(mode) && !isCustomerLinkedForFinance(customerId);
}

export function computeDepositApplyAmount(depositBalance: number, cartTotal: number): number {
  return Math.max(0, Math.min(Math.max(0, depositBalance), Math.max(0, cartTotal)));
}

export function computeDepositShortfall(depositBalance: number, cartTotal: number): number {
  return Math.max(0, cartTotal - computeDepositApplyAmount(depositBalance, cartTotal));
}

export function getCreditLimitStatus(params: {
  creditLimit: number | null | undefined;
  creditAvailable: number | null | undefined;
  receivableOutstanding: number;
  additionalCreditAmount?: number;
}): CreditLimitStatus {
  const { creditLimit, creditAvailable, receivableOutstanding, additionalCreditAmount = 0 } = params;

  if (creditLimit === 0) {
    return 'over';
  }

  if (creditAvailable != null && additionalCreditAmount > creditAvailable) {
    return 'over';
  }

  if (creditLimit != null && creditLimit > 0) {
    const projectedOutstanding = receivableOutstanding + additionalCreditAmount;
    if (projectedOutstanding > creditLimit) {
      return 'over';
    }
    if (projectedOutstanding / creditLimit >= CREDIT_NEAR_LIMIT_RATIO) {
      return 'warning';
    }
    return 'ok';
  }

  return 'ok';
}

export function canCheckoutFullDeposit(depositBalance: number | null | undefined, cartTotal: number): boolean {
  return (depositBalance ?? 0) >= cartTotal && cartTotal > 0;
}

export function canCheckoutDepositPlusCredit(params: {
  depositBalance: number | null | undefined;
  cartTotal: number;
  creditLimit: number | null | undefined;
  creditAvailable: number | null | undefined;
  receivableOutstanding?: number;
  hasCreditApprovalToken?: boolean;
}): boolean {
  const depositBalance = params.depositBalance ?? 0;
  const shortfall = computeDepositShortfall(depositBalance, params.cartTotal);
  if (shortfall <= 0 || depositBalance <= 0) {
    return false;
  }
  if (params.creditLimit === 0) {
    return false;
  }
  const status = getCreditLimitStatus({
    creditLimit: params.creditLimit,
    creditAvailable: params.creditAvailable,
    receivableOutstanding: params.receivableOutstanding ?? 0,
    additionalCreditAmount: shortfall,
  });
  if (status === 'over' && !params.hasCreditApprovalToken) {
    return false;
  }
  return true;
}

export function buildDepositPlusCreditPayments(
  depositBalance: number,
  cartTotal: number,
): Array<{ method: 'DEPOSIT' | 'CREDIT'; amount: number }> {
  const depositAmount = computeDepositApplyAmount(depositBalance, cartTotal);
  const creditAmount = cartTotal - depositAmount;
  const payments: Array<{ method: 'DEPOSIT' | 'CREDIT'; amount: number }> = [];
  if (depositAmount > 0) {
    payments.push({ method: 'DEPOSIT', amount: depositAmount });
  }
  if (creditAmount > 0) {
    payments.push({ method: 'CREDIT', amount: creditAmount });
  }
  return payments;
}
