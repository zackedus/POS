import { apiConfig } from './api';
import { authFetch } from './auth';

export interface AnalyticsCategoryMargin {
  categoryId: string;
  categoryName: string;
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
  quantity: number;
}

export interface AnalyticsReport {
  outletId: string;
  periodDays: 7 | 30;
  dateFrom: string;
  dateTo: string;
  timezone: string;
  summary: {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
    itemCount: number;
  };
  marginByCategory: AnalyticsCategoryMargin[];
  topProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    quantity: number;
  }>;
  salesTrend: Array<{ date: string; revenue: number; transactionItems: number }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const REPORTS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/reports`;

export async function fetchAnalytics(options?: {
  outletId?: string;
  days?: 7 | 30;
}): Promise<AnalyticsReport | null> {
  const params = new URLSearchParams();
  if (options?.outletId) params.set('outletId', options.outletId);
  if (options?.days) params.set('days', String(options.days));
  const qs = params.toString();
  const url = `${REPORTS_BASE}/analytics${qs ? `?${qs}` : ''}`;

  try {
    const res = await authFetch(url);
    const json = (await res.json()) as ApiEnvelope<AnalyticsReport>;
    if (res.ok && json.success && json.data) {
      return json.data;
    }
  } catch {
    /* fallback */
  }
  return null;
}

export async function downloadAnalyticsMarginCsv(options?: {
  outletId?: string;
  days?: 7 | 30;
}): Promise<{ filename: string; blob: Blob } | null> {
  const params = new URLSearchParams();
  if (options?.outletId) params.set('outletId', options.outletId);
  if (options?.days) params.set('days', String(options.days));
  const qs = params.toString();
  const url = `${REPORTS_BASE}/analytics/export${qs ? `?${qs}` : ''}`;

  try {
    const res = await authFetch(url);
    if (!res.ok) {
      return null;
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? `analitik-margin-${options?.days ?? 7}hari.csv`;
    const blob = await res.blob();
    return { filename, blob };
  } catch {
    return null;
  }
}

export async function downloadAnalyticsWeeklyCsv(options?: {
  outletId?: string;
}): Promise<{ filename: string; blob: Blob } | null> {
  const params = new URLSearchParams({ preset: 'week' });
  if (options?.outletId) params.set('outletId', options.outletId);
  const url = `${REPORTS_BASE}/analytics/export/scheduled?${params.toString()}`;

  try {
    const res = await authFetch(url);
    if (!res.ok) {
      return null;
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="([^"]+)"/.exec(disposition);
    const filename = match?.[1] ?? 'analitik-minggu-ini.csv';
    const blob = await res.blob();
    return { filename, blob };
  } catch {
    return null;
  }
}
