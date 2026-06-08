import type { FinanceReportPeriod } from '../constants/finance-reports';
import type { ReceivableAgingBucket } from './finance-types';

export interface FinanceReportMeta {
  outletId: string | null;
  period: FinanceReportPeriod | 'custom';
  date: string;
  dateFrom: string;
  dateTo: string;
  isRange: boolean;
  timezone: 'Asia/Jakarta';
  generatedAt: string;
}

export interface ProfitLossReport {
  meta: FinanceReportMeta;
  revenue: {
    grossSales: number;
    voidRefund: number;
    netSales: number;
    transactionCount: number;
  };
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  expensesByCategory: Array<{ category: string; amount: number }>;
  netProfit: number;
  netMarginPercent: number;
}

export interface ReceivablesFinanceReport {
  meta: FinanceReportMeta;
  summary: {
    outstanding: number;
    newInPeriod: number;
    collectionsInPeriod: number;
    overdueCount: number;
    overdueAmount: number;
  };
  aging: Record<ReceivableAgingBucket, { count: number; amount: number }>;
}

export interface PayablesFinanceReport {
  meta: FinanceReportMeta;
  summary: {
    outstanding: number;
    newInPeriod: number;
    paymentsInPeriod: number;
    overdueCount: number;
    overdueAmount: number;
  };
}

export interface CashFlowFinanceReport {
  meta: FinanceReportMeta;
  cashIn: {
    cashSales: number;
    receivableCollections: number;
    total: number;
  };
  cashOut: {
    payablePayments: number;
    operatingExpenses: number;
    total: number;
  };
  netCashFlow: number;
}

export interface DailySummaryFinanceReport {
  meta: FinanceReportMeta;
  omzet: {
    gross: number;
    net: number;
    transactionCount: number;
    voidRefundTotal: number;
  };
  paymentMix: Array<{ method: string; amount: number; count: number; sharePercent: number }>;
  newReceivables: { count: number; amount: number };
  newPayables: { count: number; amount: number };
}

export const FINANCE_REPORT_PERIOD_LABELS: Record<FinanceReportPeriod, string> = {
  day: 'Harian',
  week: 'Mingguan',
  month: 'Bulanan',
  year: 'Tahunan',
};

export const FINANCE_REPORT_TYPE_LABELS = {
  'profit-loss': 'Laba Rugi',
  receivables: 'Piutang',
  payables: 'Utang',
  'cash-flow': 'Arus Kas',
  'daily-summary': 'Ringkasan Harian',
} as const;

export type FinanceReportType = keyof typeof FINANCE_REPORT_TYPE_LABELS;
