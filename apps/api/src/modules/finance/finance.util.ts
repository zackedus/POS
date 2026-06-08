import { ReceivableStatus, PayableStatus } from '@barokah/shared';

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
