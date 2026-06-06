import { PaymentMethod } from '@barokah/shared';
import { apiConfig } from './api';
import { authFetch } from './auth';

export interface DailyPaymentMixItem {
  method: PaymentMethod | string;
  amount: number;
  count: number;
  sharePercent: number;
}

/** Mirrors `GET /api/v1/reports/daily` response `data`. */
export interface DailyReport {
  outletId: string;
  date: string;
  dateFrom?: string;
  dateTo?: string;
  isRange?: boolean;
  timezone: string;
  transactionCount: number;
  grossOmzet: number;
  netOmzet: number;
  voidRefundCount: number;
  voidRefundTotal: number;
  paymentMix: DailyPaymentMixItem[];
}

export interface DashboardShiftSummary {
  shiftId: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
  transactionCount: number;
  grossOmzet: number;
  isOpen: boolean;
}

/** Mirrors `GET /api/v1/reports/dashboard` response `data`. */
export interface DashboardReport {
  outletId: string;
  date: string;
  dateFrom?: string;
  dateTo?: string;
  isRange?: boolean;
  timezone: string;
  pulse: {
    transactionCount: number;
    grossOmzet: number;
    netOmzet: number;
    voidRefundCount: number;
    voidRefundTotal: number;
    paymentMix: DailyPaymentMixItem[];
  };
  operations: {
    activeShifts: number;
    shiftsClosedToday: number;
  };
  shiftSummaries: DashboardShiftSummary[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const REPORTS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/reports`;

export interface ReportOutlet {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  isActive?: boolean;
}

export interface OutletsListResponse {
  outlets: ReportOutlet[];
  requiresOutletSelection: boolean;
  defaultOutletId: string | null;
}

/** Label metode pembayaran untuk UI Bahasa Indonesia. */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PaymentMethod.CASH]: 'Tunai',
  [PaymentMethod.TRANSFER]: 'Transfer',
  [PaymentMethod.QRIS]: 'QRIS',
  [PaymentMethod.E_WALLET]: 'E-Wallet',
  [PaymentMethod.CARD]: 'Kartu',
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Data kosong saat API belum tersedia atau gagal (fallback aman). */
export function getMockDailyReport(date: string): DailyReport {
  return {
    outletId: '',
    date,
    timezone: 'Asia/Jakarta',
    transactionCount: 0,
    grossOmzet: 0,
    netOmzet: 0,
    voidRefundCount: 0,
    voidRefundTotal: 0,
    paymentMix: [
      { method: PaymentMethod.CASH, amount: 0, count: 0, sharePercent: 0 },
      { method: PaymentMethod.TRANSFER, amount: 0, count: 0, sharePercent: 0 },
      { method: PaymentMethod.QRIS, amount: 0, count: 0, sharePercent: 0 },
    ],
  };
}

/** Fallback dashboard saat API belum tersedia. */
export function getMockDashboard(date: string): DashboardReport {
  const daily = getMockDailyReport(date);
  return {
    outletId: daily.outletId,
    date: daily.date,
    timezone: daily.timezone,
    pulse: {
      transactionCount: daily.transactionCount,
      grossOmzet: daily.grossOmzet,
      netOmzet: daily.netOmzet,
      voidRefundCount: daily.voidRefundCount,
      voidRefundTotal: daily.voidRefundTotal,
      paymentMix: daily.paymentMix,
    },
    operations: {
      activeShifts: 0,
      shiftsClosedToday: 0,
    },
    shiftSummaries: [],
  };
}

export async function fetchOutlets(): Promise<OutletsListResponse | null> {
  try {
    const res = await authFetch(`${REPORTS_BASE}/outlets`);
    const json = (await res.json()) as ApiEnvelope<OutletsListResponse>;
    if (res.ok && json.success && json.data) {
      return json.data;
    }
  } catch {
    /* fallback below */
  }
  return null;
}

export async function fetchDailyReport(options?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  outletId?: string;
}): Promise<{
  report: DailyReport;
  source: 'api' | 'mock';
}> {
  const reportDate = options?.date ?? todayIsoDate();
  const params = new URLSearchParams();
  if (options?.dateFrom && options?.dateTo) {
    params.set('dateFrom', options.dateFrom);
    params.set('dateTo', options.dateTo);
  } else {
    params.set('date', options?.date ?? reportDate);
  }
  if (options?.outletId) {
    params.set('outletId', options.outletId);
  }
  const url = `${REPORTS_BASE}/daily?${params.toString()}`;

  try {
    const res = await authFetch(url);
    const json = (await res.json()) as ApiEnvelope<DailyReport>;

    if (res.ok && json.success && json.data) {
      return { report: json.data, source: 'api' };
    }
  } catch {
    /* fallback below */
  }

  return { report: getMockDailyReport(reportDate), source: 'mock' };
}

export async function fetchDashboard(options?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  outletId?: string;
}): Promise<{
  dashboard: DashboardReport;
  source: 'api' | 'mock';
}> {
  const reportDate = options?.date ?? todayIsoDate();
  const params = new URLSearchParams();
  if (options?.dateFrom && options?.dateTo) {
    params.set('dateFrom', options.dateFrom);
    params.set('dateTo', options.dateTo);
  } else {
    params.set('date', options?.date ?? reportDate);
  }
  if (options?.outletId) {
    params.set('outletId', options.outletId);
  }
  const url = `${REPORTS_BASE}/dashboard?${params.toString()}`;

  try {
    const res = await authFetch(url);
    const json = (await res.json()) as ApiEnvelope<DashboardReport>;

    if (res.ok && json.success && json.data) {
      return { dashboard: json.data, source: 'api' };
    }
  } catch {
    /* fallback below */
  }

  return { dashboard: getMockDashboard(reportDate), source: 'mock' };
}

export interface StockReportSummary {
  outletId: string;
  totalSkus: number;
  totalQuantity: number;
  lowStockCount: number;
  stockValue: number;
  hasCostData: boolean;
  topLowStock: Array<{
    sku: string;
    displayName: string;
    quantity: number;
    minStock: number;
  }>;
}

export async function fetchStockReport(outletId?: string): Promise<StockReportSummary | null> {
  const params = new URLSearchParams();
  if (outletId) params.set('outletId', outletId);
  const qs = params.toString();
  const url = `${REPORTS_BASE}/stock${qs ? `?${qs}` : ''}`;

  try {
    const res = await authFetch(url);
    const json = (await res.json()) as ApiEnvelope<StockReportSummary>;
    if (res.ok && json.success && json.data) {
      return json.data;
    }
  } catch {
    /* fallback below */
  }
  return null;
}

export interface CrossOutletStockProduct {
  productId: string;
  sku: string;
  displayName: string;
  unitSymbol: string | null;
  byOutlet: Array<{
    outletId: string;
    outletName: string;
    outletCode: string;
    quantity: number;
  }>;
}

export interface CrossOutletStockSummary {
  currentOutletId: string;
  outlets: Array<{ id: string; name: string; code: string }>;
  products: CrossOutletStockProduct[];
}

export async function fetchCrossOutletStock(outletId?: string): Promise<CrossOutletStockSummary | null> {
  const params = new URLSearchParams();
  if (outletId) params.set('outletId', outletId);
  const qs = params.toString();
  const url = `${REPORTS_BASE}/cross-outlet-stock${qs ? `?${qs}` : ''}`;

  try {
    const res = await authFetch(url);
    const json = (await res.json()) as ApiEnvelope<CrossOutletStockSummary>;
    if (res.ok && json.success && json.data) {
      return json.data;
    }
  } catch {
    /* fallback */
  }
  return null;
}

export type DailyReportExportResult =
  | { status: 'downloaded'; filename: string }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

/** Export laporan harian/rentang — memanggil API saat tersedia, fallback pesan jika belum. */
export async function exportDailyReport(options: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  outletId?: string;
  format?: 'csv' | 'pdf';
}): Promise<DailyReportExportResult> {
  const params = new URLSearchParams();
  if (options.dateFrom && options.dateTo) {
    params.set('dateFrom', options.dateFrom);
    params.set('dateTo', options.dateTo);
  } else {
    params.set('date', options.date ?? todayIsoDate());
  }
  if (options.outletId) {
    params.set('outletId', options.outletId);
  }
  params.set('format', options.format ?? 'csv');
  const url = `${REPORTS_BASE}/daily/export?${params.toString()}`;

  try {
    const res = await authFetch(url);

    if (res.status === 404 || res.status === 501) {
      return {
        status: 'unavailable',
        message: 'Export laporan belum tersedia di server. Fitur akan aktif setelah API export dirilis.',
      };
    }

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as ApiEnvelope<unknown> | null;
      return {
        status: 'error',
        message: json?.error?.message ?? 'Gagal mengekspor laporan.',
      };
    }

    const contentType = res.headers.get('Content-Type') ?? '';
    if (contentType.includes('application/json')) {
      const json = (await res.json()) as ApiEnvelope<{ format: string }>;
      if (json.success) {
        return {
          status: 'unavailable',
          message: 'Respons export bukan file unduhan. Periksa parameter format.',
        };
      }
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    const filenameMatch = disposition?.match(/filename="?([^";]+)"?/i);
    const isRange = Boolean(options.dateFrom && options.dateTo);
    const defaultName =
      options.format === 'pdf'
        ? isRange
          ? `laporan-${options.dateFrom}_${options.dateTo}.pdf`
          : `laporan-harian-${options.date ?? todayIsoDate()}.pdf`
        : isRange
          ? `laporan-${options.dateFrom}_${options.dateTo}.csv`
          : `laporan-harian-${options.date ?? todayIsoDate()}.csv`;
    const filename = filenameMatch?.[1] ?? defaultName;

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    return { status: 'downloaded', filename };
  } catch {
    return {
      status: 'unavailable',
      message: 'Export laporan belum tersedia — tidak dapat terhubung ke API export.',
    };
  }
}
