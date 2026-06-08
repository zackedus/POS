import { apiConfig } from './api';
import { authFetch } from './auth';
import type {
  CashFlowFinanceReport,
  DailySummaryFinanceReport,
  FinanceReportPeriod,
  PayablesFinanceReport,
  ProfitLossReport,
  ReceivablesFinanceReport,
} from '@barokah/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const FINANCE_REPORTS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/reports/finance`;

export type FinanceReportQueryParams = {
  outletId?: string;
  period?: FinanceReportPeriod;
  date?: string;
  from?: string;
  to?: string;
};

function buildQuery(params: FinanceReportQueryParams): string {
  const search = new URLSearchParams();
  if (params.outletId) search.set('outletId', params.outletId);
  if (params.from && params.to) {
    search.set('from', params.from);
    search.set('to', params.to);
  } else {
    if (params.period) search.set('period', params.period);
    if (params.date) search.set('date', params.date);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function fetchFinanceReport<T>(path: string, params: FinanceReportQueryParams = {}): Promise<T> {
  const res = await authFetch(`${FINANCE_REPORTS_BASE}/${path}${buildQuery(params)}`);
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat laporan keuangan.');
  }
  return json.data;
}

export async function fetchProfitLossReport(params: FinanceReportQueryParams = {}): Promise<ProfitLossReport> {
  return fetchFinanceReport<ProfitLossReport>('profit-loss', params);
}

export async function fetchReceivablesFinanceReport(
  params: FinanceReportQueryParams = {},
): Promise<ReceivablesFinanceReport> {
  return fetchFinanceReport<ReceivablesFinanceReport>('receivables', params);
}

export async function fetchPayablesFinanceReport(params: FinanceReportQueryParams = {}): Promise<PayablesFinanceReport> {
  return fetchFinanceReport<PayablesFinanceReport>('payables', params);
}

export async function fetchCashFlowReport(params: FinanceReportQueryParams = {}): Promise<CashFlowFinanceReport> {
  return fetchFinanceReport<CashFlowFinanceReport>('cash-flow', params);
}

export async function fetchDailySummaryReport(options?: {
  date?: string;
  outletId?: string;
}): Promise<DailySummaryFinanceReport> {
  const search = new URLSearchParams();
  if (options?.date) search.set('date', options.date);
  if (options?.outletId) search.set('outletId', options.outletId);
  const qs = search.toString();
  const res = await authFetch(`${FINANCE_REPORTS_BASE}/daily-summary${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<DailySummaryFinanceReport>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat ringkasan harian.');
  }
  return json.data;
}

export { getTodayDate as todayIsoDate } from '@barokah/shared';

/** Trigger browser print dialog (PDF via print-to-PDF). */
export function printFinancialReport(): void {
  window.print();
}
