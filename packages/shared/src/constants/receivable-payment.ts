import { PaymentMethod } from '../types/enums';

/** Labels for receivable settlement methods (Indonesian UI). */
export const RECEIVABLE_PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: 'Tunai',
  [PaymentMethod.TRANSFER]: 'Transfer',
  [PaymentMethod.DEPOSIT]: 'Deposit',
  [PaymentMethod.QRIS]: 'QRIS',
  [PaymentMethod.E_WALLET]: 'E-Wallet',
  [PaymentMethod.CARD]: 'Kartu',
};

export const RECEIVABLE_SETTLEMENT_METHODS = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.DEPOSIT,
  PaymentMethod.QRIS,
] as const;
