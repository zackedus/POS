import { apiConfig } from '@/lib/api';
import { authApiJson } from '@/lib/api-client';

export interface ShiftSummary {
  id: string;
  outletId?: string;
  cashierId?: string;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  difference?: number;
  openedAt: string;
  closedAt?: string | null;
  forceClosed?: boolean;
}

export interface ShiftHistoryItem {
  id: string;
  outletId: string;
  outletLabel: string;
  cashierId: string;
  cashierName: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
}

export interface ShiftHistoryResult {
  items: ShiftHistoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const SHIFTS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/shifts`;

export async function fetchActiveShift(outletId?: string): Promise<ShiftSummary | null> {
  const params = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  const data = await authApiJson<ShiftSummary | null>(
    `${SHIFTS_BASE}/active${params}`,
    undefined,
    'Gagal memuat shift aktif.',
  );
  return data ?? null;
}

export async function openShift(openingCash: number, outletId?: string): Promise<ShiftSummary> {
  return authApiJson<ShiftSummary>(
    `${SHIFTS_BASE}/open`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openingCash,
        ...(outletId ? { outletId } : {}),
      }),
    },
    'Gagal membuka shift.',
  );
}

export async function closeShift(shiftId: string, closingCash: number): Promise<ShiftSummary> {
  return authApiJson<ShiftSummary>(
    `${SHIFTS_BASE}/${shiftId}/close`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ closingCash }),
    },
    'Gagal menutup shift.',
  );
}

export async function forceCloseShift(shiftId: string, reason?: string): Promise<ShiftSummary> {
  return authApiJson<ShiftSummary>(
    `${SHIFTS_BASE}/${shiftId}/force-close`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason?.trim() || undefined }),
    },
    'Gagal force-close shift aktif.',
  );
}

export interface ShiftClosePreview {
  shiftId: string;
  openingCash: number;
  cashSales: number;
  arCashCollections: number;
  cashExpenses: number;
  expectedCash: number;
  transactionCount: number;
  heldCount?: number;
  heldWarning?: string | null;
  openedAt: string;
}

export async function fetchClosePreview(shiftId: string, outletId?: string): Promise<ShiftClosePreview> {
  const params = outletId ? `?outletId=${outletId}` : '';
  return authApiJson<ShiftClosePreview>(
    `${SHIFTS_BASE}/${shiftId}/close-preview${params}`,
    undefined,
    'Gagal memuat preview rekonsiliasi kas.',
  );
}

export interface ShiftHistoryQuery {
  outletId?: string;
  cashierId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export async function fetchShiftHistory(query: ShiftHistoryQuery = {}): Promise<ShiftHistoryResult> {
  const params = new URLSearchParams();
  if (query.outletId) params.set('outletId', query.outletId);
  if (query.cashierId) params.set('cashierId', query.cashierId);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  const qs = params.toString();
  return authApiJson<ShiftHistoryResult>(
    `${SHIFTS_BASE}/history${qs ? `?${qs}` : ''}`,
    undefined,
    'Gagal memuat riwayat shift.',
  );
}
