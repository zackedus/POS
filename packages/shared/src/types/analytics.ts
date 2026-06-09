import type { FinanceReportPeriod } from '../constants/finance-reports';
import type { PaymentMethod } from './enums';

/** Analytics period presets — same as finance reports (WIB calendar). */
export type AnalyticsPeriod = FinanceReportPeriod;

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  day: 'Hari ini',
  week: 'Mingguan',
  month: 'Bulanan',
  year: 'Tahunan',
};

export type AnalyticsChangeDirection = 'up' | 'down' | 'flat';

export interface AnalyticsKpiMetric {
  current: number;
  previous: number;
  changePercent: number | null;
  direction: AnalyticsChangeDirection;
}

export interface AnalyticsSalesTrendPoint {
  label: string;
  date?: string;
  revenue: number;
  transactionCount: number;
}

export interface AnalyticsTopProduct {
  productId: string;
  productName: string;
  quantity: number;
  revenue: number;
}

export interface AnalyticsPaymentMethodRow {
  method: PaymentMethod;
  amount: number;
  count: number;
  sharePercent: number;
}

export interface AnalyticsOutletPerformanceRow {
  outletId: string;
  outletName: string;
  revenue: number;
  transactionCount: number;
  grossProfit: number;
}

export interface AnalyticsCategoryMargin {
  categoryId: string;
  categoryName: string;
  revenue: number;
  margin: number;
  marginPercent: number;
  quantity: number;
}

export interface AnalyticsFinanceSnapshot {
  receivablesOutstanding: number;
  receivablesOverdueCount: number;
  payablesOutstanding: number;
  payablesOverdueCount: number;
}

export interface AnalyticsSummary {
  outletId: string | null;
  period: AnalyticsPeriod | 'custom';
  dateFrom: string;
  dateTo: string;
  previousDateFrom: string;
  previousDateTo: string;
  timezone: string;
  pulse: {
    netSales: AnalyticsKpiMetric;
    transactionCount: AnalyticsKpiMetric;
    averageTicket: AnalyticsKpiMetric;
    grossProfit: AnalyticsKpiMetric;
    grossProfitPercent: number;
  };
  salesTrend: AnalyticsSalesTrendPoint[];
  topProducts: AnalyticsTopProduct[];
  paymentMethods: AnalyticsPaymentMethodRow[];
  outletPerformance: AnalyticsOutletPerformanceRow[] | null;
  financeSnapshot: AnalyticsFinanceSnapshot;
  marginByCategory: AnalyticsCategoryMargin[];
  insights: string[];
}
