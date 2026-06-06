/** POS hold transaction TTL — synced with API `transactions.service` HOLD_TTL_MINUTES. */
export const POS_HOLD_TTL_MINUTES = 120;

/** Online order payment window — synced with API `online-order.util` PAYMENT_TTL_MINUTES. */
export const ONLINE_PAYMENT_TTL_MINUTES = 60;

/** Default payment methods at kasir (MVP hardcoded in PosCartPanel). */
export const POS_PAYMENT_METHODS = [
  { code: 'CASH', label: 'Tunai', enabled: true },
  { code: 'TRANSFER', label: 'Transfer', enabled: true },
  { code: 'QRIS', label: 'QRIS (mock/sandbox)', enabled: true },
  { code: 'E_WALLET', label: 'E-Wallet', enabled: false, defer: true },
  { code: 'CARD', label: 'Kartu / EDC', enabled: false, defer: true },
] as const;
