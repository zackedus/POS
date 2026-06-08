/** Default credit limit for new customers (IDR integer). */
export const DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR = 1_000_000;

/** Auto-increase: +500k for every 10M cumulative paid receivables (zero overdue). */
export const CREDIT_AUTO_INCREASE_THRESHOLD_IDR = 10_000_000;
export const CREDIT_AUTO_INCREASE_AMOUNT_IDR = 500_000;

/** Configurable cap for auto-increased limit (owner can override higher manually). */
export const CREDIT_AUTO_INCREASE_MAX_LIMIT_IDR = 50_000_000;

/** Short-lived manager approval token TTL (5 minutes). */
export const CREDIT_APPROVAL_TOKEN_TTL_MS = 5 * 60 * 1000;

export const CUSTOMER_CREDIT_AUDIT_ACTION_LABELS: Record<string, string> = {
  LIMIT_SET: 'Penyesuaian limit manual',
  LIMIT_AUTO_INCREASE: 'Kenaikan limit otomatis',
  OVER_LIMIT_APPROVAL: 'Persetujuan over-limit',
  CREDIT_SALE: 'Penjualan tempo',
};
