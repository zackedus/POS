import type { PaymentMode } from '@/components/pos/pos-types';

export const FINANCE_CUSTOMER_REQUIRED_MESSAGE =
  'Pilih pelanggan terlebih dahulu untuk bayar tempo/deposit';

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

export function isFinancePaymentButtonDisabled(
  mode: PaymentMode,
  customerId: string | null | undefined,
): boolean {
  return isFinancePaymentMode(mode) && !isCustomerLinkedForFinance(customerId);
}
