import { ErrorCodes } from '@barokah/shared';
import type { SyncConflictResolutionAction } from '@barokah/shared';
import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';

export interface SyncConflictItem {
  id: string;
  clientRequestId: string;
  operation: string;
  conflictCode: string | null;
  conflictMessage: string | null;
  deviceId: string | null;
  clientCreatedAt: string | null;
  processedAt: string | null;
  queuedAt: string;
}

export interface SyncConflictsResponse {
  outletId: string;
  total: number;
  conflicts: SyncConflictItem[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

/** User-facing copy — no raw error codes in UI (OFFLINE-SYNC.md). */
export function getConflictUserMessage(
  conflictCode: string | null,
  fallback?: string | null,
): string {
  switch (conflictCode) {
    case ErrorCodes.INSUFFICIENT_STOCK:
      return 'Stok tidak mencukupi saat sinkronisasi. Sesuaikan jumlah di keranjang atau batalkan transaksi.';
    case ErrorCodes.SYNC_MASTER_STALE:
      return 'Harga/katalog berubah di server. Muat ulang produk lalu periksa keranjang sebelum coba lagi.';
    case ErrorCodes.SYNC_CONFLICT_MANUAL:
    case ErrorCodes.SYNC_CONFLICT:
      return 'Transaksi offline bentrok — perlu penyelesaian manual.';
    case ErrorCodes.SHIFT_ALREADY_OPEN:
    case ErrorCodes.SHIFT_NOT_OPEN:
      return 'Shift tidak sesuai kondisi server. Hubungi manager untuk shift.';
    case ErrorCodes.CONFLICT:
      return 'Hold atau transaksi sudah diproses sesi lain. Batalkan antrean lokal jika tidak relevan.';
    default:
      return fallback?.trim() || 'Sinkronisasi gagal — pilih tindakan penyelesaian di bawah.';
  }
}

/** Resolve strategy label for conflict modal (server wins vs client wins). */
export function getConflictStrategyLabel(conflictCode: string | null): string {
  switch (conflictCode) {
    case ErrorCodes.SYNC_MASTER_STALE:
    case ErrorCodes.SHIFT_ALREADY_OPEN:
    case ErrorCodes.SHIFT_NOT_OPEN:
      return 'Server menang — sesuaikan dengan kondisi server';
    case ErrorCodes.INSUFFICIENT_STOCK:
      return 'Server menang stok — sesuaikan keranjang atau batalkan';
    case ErrorCodes.CONFLICT:
      return 'Manual — hold/transaksi sudah diproses sesi lain';
    default:
      return 'Manual — pilih terima server atau coba ulang klien';
  }
}

/** Resolve actions offered per conflict code (OFFLINE-SYNC.md § Manual resolve). */
export function getConflictActions(conflictCode: string | null): SyncConflictResolutionAction[] {
  switch (conflictCode) {
    case ErrorCodes.INSUFFICIENT_STOCK:
      return ['USE_SERVER', 'ADJUST_QTY', 'KEEP_CLIENT', 'CANCEL', 'ESCALATE_MANAGER'];
    case ErrorCodes.SYNC_MASTER_STALE:
      return ['USE_SERVER', 'KEEP_CLIENT', 'CANCEL', 'ESCALATE_MANAGER'];
    case ErrorCodes.SHIFT_ALREADY_OPEN:
    case ErrorCodes.SHIFT_NOT_OPEN:
      return ['USE_SERVER', 'ESCALATE_MANAGER', 'CANCEL'];
    default:
      return ['USE_SERVER', 'KEEP_CLIENT', 'RETRY', 'CANCEL', 'ESCALATE_MANAGER'];
  }
}

export function getConflictActionLabel(action: SyncConflictResolutionAction): string {
  const labels: Record<SyncConflictResolutionAction, string> = {
    RETRY: 'Coba sinkron ulang',
    ADJUST_QTY: 'Sesuaikan keranjang',
    CANCEL: 'Batalkan antrean',
    ESCALATE_MANAGER: 'Eskalasi manager',
    USE_SERVER: 'Terima data server',
    KEEP_CLIENT: 'Coba ulang (data lokal)',
  };
  return labels[action];
}

export async function fetchSyncConflicts(limit = 20): Promise<SyncConflictsResponse> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/sync/conflicts?limit=${limit}`,
  );
  const json = (await res.json()) as ApiEnvelope<SyncConflictsResponse>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat daftar konflik sinkronisasi.');
  }
  return json.data;
}

export function recordConflictResolution(
  queueEntryId: string,
  resolution: SyncConflictResolutionAction,
  note?: string,
): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const key = 'barokah-pos-conflict-resolutions';
    const raw = window.localStorage.getItem(key);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push({
      queueEntryId,
      resolution,
      resolvedAt: new Date().toISOString(),
      note: note?.trim() || undefined,
    });
    const trimmed = list.slice(-100);
    window.localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    /* audit trail best-effort */
  }
}
