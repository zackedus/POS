import { ReceivableStatus, PayableStatus, type ReceivableAgingBucket } from '@barokah/shared';

export function startOfDayUtc(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`);
}

export function computeDaysOverdue(dueDate: Date | null, asOf: Date): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);
  const ref = new Date(asOf);
  ref.setUTCHours(0, 0, 0, 0);
  const diffMs = ref.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function computeAgingBucket(daysOverdue: number): ReceivableAgingBucket {
  if (daysOverdue <= 0) return 'CURRENT';
  if (daysOverdue <= 30) return 'DAYS_0_30';
  if (daysOverdue <= 60) return 'DAYS_31_60';
  if (daysOverdue <= 90) return 'DAYS_61_90';
  return 'DAYS_90_PLUS';
}

export const AGING_BUCKET_ORDER: ReceivableAgingBucket[] = [
  'CURRENT',
  'DAYS_0_30',
  'DAYS_31_60',
  'DAYS_61_90',
  'DAYS_90_PLUS',
];

export function emptyAgingTotals(): Record<ReceivableAgingBucket, { count: number; amount: number }> {
  return {
    CURRENT: { count: 0, amount: 0 },
    DAYS_0_30: { count: 0, amount: 0 },
    DAYS_31_60: { count: 0, amount: 0 },
    DAYS_61_90: { count: 0, amount: 0 },
    DAYS_90_PLUS: { count: 0, amount: 0 },
  };
}

export function computeReceivableStatus(
  amountIdr: number,
  paidAmountIdr: number,
  isVoid = false,
): ReceivableStatus {
  if (isVoid) return ReceivableStatus.VOID;
  if (paidAmountIdr <= 0) return ReceivableStatus.OPEN;
  if (paidAmountIdr >= amountIdr) return ReceivableStatus.PAID;
  return ReceivableStatus.PARTIAL;
}

export function computePayableStatus(
  amountIdr: number,
  paidAmountIdr: number,
  isVoid = false,
): PayableStatus {
  if (isVoid) return PayableStatus.VOID;
  if (paidAmountIdr <= 0) return PayableStatus.OPEN;
  if (paidAmountIdr >= amountIdr) return PayableStatus.PAID;
  return PayableStatus.PARTIAL;
}

export function computeOutstanding(amountIdr: number, paidAmountIdr: number): number {
  return Math.max(0, amountIdr - paidAmountIdr);
}
