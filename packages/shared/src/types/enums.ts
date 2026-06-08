export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  INVENTORY = 'INVENTORY',
  ACCOUNTANT = 'ACCOUNTANT',
}

export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  QRIS = 'QRIS',
  E_WALLET = 'E_WALLET',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  DEPOSIT = 'DEPOSIT',
}

export enum ReceivableStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum PayableStatus {
  OPEN = 'OPEN',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  VOID = 'VOID',
}

export enum DepositAccountStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum DepositTransactionType {
  TOP_UP = 'TOP_UP',
  APPLY = 'APPLY',
  REFUND = 'REFUND',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
}
