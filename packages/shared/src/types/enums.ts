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
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  VOID = 'VOID',
  REFUNDED = 'REFUNDED',
}
