/** Receipt code prefix for payment proof numbers (BKT-{code}-YYYYMMDD-NNN). */
export type PaymentReceiptCode = 'REC' | 'PAY' | 'DEP' | 'EXP';

export type PaymentReceiptKind =
  | 'DEPOSIT_TOP_UP'
  | 'PAYABLE_PAYMENT'
  | 'RECEIVABLE_PAYMENT';

export const PAYMENT_RECEIPT_KIND_TITLES: Record<PaymentReceiptKind, string> = {
  DEPOSIT_TOP_UP: 'Bukti Top-up Deposit',
  PAYABLE_PAYMENT: 'Bukti Pembayaran Utang',
  RECEIVABLE_PAYMENT: 'Bukti Pelunasan Piutang',
};

export const PAYMENT_RECEIPT_CODE_BY_KIND: Record<PaymentReceiptKind, PaymentReceiptCode> = {
  DEPOSIT_TOP_UP: 'DEP',
  PAYABLE_PAYMENT: 'PAY',
  RECEIVABLE_PAYMENT: 'REC',
};

export interface PaymentReceiptView {
  receiptNumber: string;
  kind: PaymentReceiptKind;
  amount: number;
  method: string;
  createdAt: string;
  recordedByName: string;
  counterpartyName: string;
  counterpartyPhone?: string | null;
  storeName: string;
  outletName?: string | null;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  outstandingBefore?: number | null;
  outstandingAfter?: number | null;
  transferReference?: string | null;
  bankName?: string | null;
  notes?: string | null;
  referenceLabel?: string | null;
  paymentId?: string;
}

function toDateKey(date: Date | string): string {
  if (typeof date === 'string') {
    return date.replace(/-/g, '').slice(0, 8);
  }
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/** Build formatted payment receipt number, e.g. BKT-DEP-20260609-001 */
export function buildPaymentReceiptNumber(
  code: PaymentReceiptCode,
  date: Date | string,
  sequence: number,
): string {
  return `BKT-${code}-${toDateKey(date)}-${String(sequence).padStart(3, '0')}`;
}
