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

const SHIFTS_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/shifts`;

export async function fetchActiveShift(): Promise<ShiftSummary | null> {
  const data = await authApiJson<ShiftSummary | null>(`${SHIFTS_BASE}/active`, undefined, 'Gagal memuat shift aktif.');
  return data ?? null;
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

export interface ShiftClosePreview {
  shiftId: string;
  openingCash: number;
  cashSales: number;
  expectedCash: number;
  transactionCount: number;
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
