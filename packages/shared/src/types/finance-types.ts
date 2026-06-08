/** Aging bucket keys for receivables overdue report. */
export type ReceivableAgingBucket =
  | 'CURRENT'
  | 'DAYS_0_30'
  | 'DAYS_31_60'
  | 'DAYS_61_90'
  | 'DAYS_90_PLUS';

export const RECEIVABLE_AGING_BUCKET_LABELS: Record<ReceivableAgingBucket, string> = {
  CURRENT: 'Belum jatuh tempo',
  DAYS_0_30: '1–30 hari',
  DAYS_31_60: '31–60 hari',
  DAYS_61_90: '61–90 hari',
  DAYS_90_PLUS: '90+ hari',
};

export interface ReceivableAgingBucketTotals {
  bucket: ReceivableAgingBucket;
  label: string;
  count: number;
  amount: number;
}

export interface ReceivableAgingRow {
  receivableId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  outletId: string | null;
  outletName: string | null;
  outstanding: number;
  dueDate: string | null;
  daysOverdue: number;
  bucket: ReceivableAgingBucket;
  createdAt: string;
}

export interface ReceivableAgingByCustomer {
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalOutstanding: number;
  buckets: ReceivableAgingBucketTotals[];
}

export interface ReceivableAgingReport {
  asOf: string;
  outletId: string | null;
  groupByCustomer: boolean;
  totals: ReceivableAgingBucketTotals[];
  totalOutstanding: number;
  rows?: ReceivableAgingRow[];
  byCustomer?: ReceivableAgingByCustomer[];
}

export interface FinanceSummary {
  receivableOutstanding: number;
  payableOutstanding: number;
  depositBalance: number;
  cashToday: number;
  overdueReceivableCount: number;
  overdueReceivableAmount: number;
  date: string;
  outletId: string | null;
}

export type StatementEntryType = 'INVOICE' | 'PAYMENT';

export interface CustomerStatementEntry {
  id: string;
  date: string;
  type: StatementEntryType;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export interface CustomerStatement {
  customer: {
    id: string;
    name: string;
    phone: string;
    creditLimit: number | null;
  };
  period: { from: string; to: string };
  openingBalance: number;
  entries: CustomerStatementEntry[];
  closingBalance: number;
  depositBalance: number;
  generatedAt: string;
}
