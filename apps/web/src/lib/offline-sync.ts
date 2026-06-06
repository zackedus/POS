import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import {
  type OfflineCheckoutCashPayload,
  type OfflineCheckoutSplitPayload,
  type OfflineQueueEntry,
  listPendingOfflineTransactions,
  removeOfflineQueueEntry,
  updateOfflineQueueEntry,
} from '@/lib/offline-queue';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

type SyncQueueOperation = 'CHECKOUT_CASH' | 'CHECKOUT_SPLIT';

type SyncQueueEntryStatus = 'PENDING' | 'PROCESSING' | 'APPLIED' | 'CONFLICT' | 'FAILED';

interface SyncQueueEnqueueEntryResult {
  clientRequestId: string;
  status: SyncQueueEntryStatus;
  transactionId: string | null;
  conflictCode: string | null;
  conflictMessage: string | null;
  idempotentReplay: boolean;
}

interface SyncQueueEnqueueResponse {
  outletId: string;
  processor: string;
  replayedCount: number;
  entries: SyncQueueEnqueueEntryResult[];
}

export interface SyncQueueItemResult {
  id: string;
  ok: boolean;
  receiptNo?: string;
  transactionId?: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface SyncQueueSummary {
  synced: SyncQueueItemResult[];
  failed: SyncQueueItemResult[];
}

function mapKindToOperation(kind: OfflineQueueEntry['kind']): SyncQueueOperation {
  return kind === 'checkout-cash' ? 'CHECKOUT_CASH' : 'CHECKOUT_SPLIT';
}

function getDeviceId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    const key = 'barokah-pos-device-id';
    let deviceId = window.localStorage.getItem(key);
    if (!deviceId) {
      deviceId = `pwa-${crypto.randomUUID()}`;
      window.localStorage.setItem(key, deviceId);
    }
    return deviceId;
  } catch {
    return undefined;
  }
}

async function postSyncQueue(entry: OfflineQueueEntry): Promise<{
  res: Response;
  json: ApiEnvelope<SyncQueueEnqueueResponse>;
}> {
  const payload = entry.payload as OfflineCheckoutCashPayload | OfflineCheckoutSplitPayload;
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/sync/queue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entries: [
        {
          clientRequestId: payload.clientRequestId,
          operation: mapKindToOperation(entry.kind),
          payload,
          clientCreatedAt: entry.createdAt,
          deviceId: getDeviceId(),
        },
      ],
    }),
  });
  const json = (await res.json()) as ApiEnvelope<SyncQueueEnqueueResponse>;
  return { res, json };
}

function resolveEnqueueResult(
  entry: OfflineQueueEntry,
  result: SyncQueueEnqueueEntryResult | undefined,
): SyncQueueItemResult {
  if (!result) {
    const message = 'Respons sync tidak berisi entri antrean.';
    return { id: entry.id, ok: false, errorMessage: message };
  }

  if (result.status === 'APPLIED') {
    return {
      id: entry.id,
      ok: true,
      transactionId: result.transactionId ?? undefined,
    };
  }

  const message =
    result.conflictMessage ??
    (result.status === 'CONFLICT'
      ? 'Transaksi offline bentrok — perlu penyelesaian manual.'
      : 'Sinkronisasi antrean offline gagal.');

  return {
    id: entry.id,
    ok: false,
    errorMessage: message,
    errorCode: result.conflictCode ?? undefined,
  };
}

export async function syncOfflineQueueEntry(entry: OfflineQueueEntry): Promise<SyncQueueItemResult> {
  await updateOfflineQueueEntry(entry.id, {
    status: 'syncing',
    attemptCount: entry.attemptCount + 1,
    lastError: undefined,
  });

  try {
    const { res, json } = await postSyncQueue(entry);

    if (!res.ok || !json.success || !json.data) {
      const message = json.error?.message ?? 'Sinkronisasi antrean offline gagal.';
      await updateOfflineQueueEntry(entry.id, { status: 'failed', lastError: message });
      return { id: entry.id, ok: false, errorMessage: message, errorCode: json.error?.code };
    }

    const payload = entry.payload as OfflineCheckoutCashPayload | OfflineCheckoutSplitPayload;
    const result = json.data.entries.find(
      (item) => item.clientRequestId === payload.clientRequestId,
    );
    const resolved = resolveEnqueueResult(entry, result);

    if (resolved.ok) {
      await removeOfflineQueueEntry(entry.id);
      return resolved;
    }

    await updateOfflineQueueEntry(entry.id, {
      status: 'failed',
      lastError: resolved.errorMessage,
    });
    return resolved;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Koneksi gagal saat sinkronisasi antrean offline.';
    await updateOfflineQueueEntry(entry.id, { status: 'failed', lastError: message });
    return { id: entry.id, ok: false, errorMessage: message };
  }
}

export async function syncOfflineQueue(): Promise<SyncQueueSummary> {
  const pending = await listPendingOfflineTransactions();
  const synced: SyncQueueItemResult[] = [];
  const failed: SyncQueueItemResult[] = [];

  for (const entry of pending) {
    const result = await syncOfflineQueueEntry(entry);
    if (result.ok) {
      synced.push(result);
    } else {
      failed.push(result);
    }
  }

  return { synced, failed };
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}
