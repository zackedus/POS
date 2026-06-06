import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import {
  type OfflineHoldEntry,
  listPendingOfflineHolds,
  removeOfflineHoldEntry,
  updateOfflineHoldEntry,
} from '@/lib/offline-hold-queue';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export interface HoldSyncItemResult {
  id: string;
  ok: boolean;
  heldId?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface HoldSyncSummary {
  synced: HoldSyncItemResult[];
  failed: HoldSyncItemResult[];
}

export async function syncOfflineHoldEntry(entry: OfflineHoldEntry): Promise<HoldSyncItemResult> {
  await updateOfflineHoldEntry(entry.id, {
    status: 'syncing',
    attemptCount: entry.attemptCount + 1,
    lastError: undefined,
  });

  try {
    const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: entry.payload.items,
        label: entry.payload.label,
        clientRequestId: entry.payload.clientRequestId ?? entry.id,
      }),
    });
    const json = (await res.json()) as ApiEnvelope<{ id: string }>;

    if (!res.ok || !json.success || !json.data) {
      const message = json.error?.message ?? 'Sinkronisasi hold offline gagal.';
      await updateOfflineHoldEntry(entry.id, { status: 'failed', lastError: message });
      return { id: entry.id, ok: false, errorMessage: message, errorCode: json.error?.code };
    }

    await removeOfflineHoldEntry(entry.id);
    return { id: entry.id, ok: true, heldId: json.data.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Koneksi gagal saat sinkronisasi hold offline.';
    await updateOfflineHoldEntry(entry.id, { status: 'failed', lastError: message });
    return { id: entry.id, ok: false, errorMessage: message };
  }
}

export async function syncOfflineHoldQueue(): Promise<HoldSyncSummary> {
  const pending = await listPendingOfflineHolds();
  const synced: HoldSyncItemResult[] = [];
  const failed: HoldSyncItemResult[] = [];

  for (const entry of pending) {
    const result = await syncOfflineHoldEntry(entry);
    if (result.ok) {
      synced.push(result);
    } else {
      failed.push(result);
    }
  }

  return { synced, failed };
}
