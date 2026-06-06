/** IndexedDB queue for offline POS transactions (Sprint 11). */

import { OFFLINE_STORES, runOfflineStoreTransaction } from '@/lib/offline-db';

export { OFFLINE_DB_NAME, OFFLINE_DB_VERSION } from '@/lib/offline-db';
export const OFFLINE_STORE_NAME = OFFLINE_STORES.TRANSACTION_QUEUE;

export type OfflineTransactionKind = 'checkout-cash' | 'checkout-split';

export type OfflineQueueStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineCheckoutCashPayload {
  items: Array<{ productId: string; quantity: number }>;
  cashReceived: number;
  notes?: string;
  clientRequestId: string;
}

export interface OfflineCheckoutSplitPayload {
  items: Array<{ productId: string; quantity: number }>;
  payments: Array<{ method: string; amount: number; reference?: string }>;
  clientRequestId: string;
}

export interface OfflineQueueEntry {
  id: string;
  kind: OfflineTransactionKind;
  payload: OfflineCheckoutCashPayload | OfflineCheckoutSplitPayload;
  status: OfflineQueueStatus;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
}

export function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOfflineTransaction(
  entry: Omit<OfflineQueueEntry, 'status' | 'createdAt' | 'attemptCount'> & {
    status?: OfflineQueueStatus;
    createdAt?: string;
    attemptCount?: number;
  },
): Promise<OfflineQueueEntry> {
  const record: OfflineQueueEntry = {
    ...entry,
    status: entry.status ?? 'pending',
    createdAt: entry.createdAt ?? new Date().toISOString(),
    attemptCount: entry.attemptCount ?? 0,
  };

  await runOfflineStoreTransaction(OFFLINE_STORES.TRANSACTION_QUEUE, 'readwrite', (store) =>
    store.put(record),
  );
  return record;
}

export async function listOfflineQueueEntries(): Promise<OfflineQueueEntry[]> {
  return runOfflineStoreTransaction(OFFLINE_STORES.TRANSACTION_QUEUE, 'readonly', (store) => {
    const request = store.getAll();
    return request;
  }).then((rows) => rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
}

export async function listPendingOfflineTransactions(): Promise<OfflineQueueEntry[]> {
  const rows = await listOfflineQueueEntries();
  return rows.filter((row) => row.status === 'pending' || row.status === 'failed');
}

export async function countPendingOfflineTransactions(): Promise<number> {
  const pending = await listPendingOfflineTransactions();
  return pending.length;
}

export async function getOfflineQueueEntry(id: string): Promise<OfflineQueueEntry | undefined> {
  return runOfflineStoreTransaction(OFFLINE_STORES.TRANSACTION_QUEUE, 'readonly', (store) =>
    store.get(id),
  );
}

export async function getOfflineQueueEntryByClientRequestId(
  clientRequestId: string,
): Promise<OfflineQueueEntry | undefined> {
  const rows = await listOfflineQueueEntries();
  return rows.find((row) => {
    const payload = row.payload as { clientRequestId?: string };
    return row.id === clientRequestId || payload.clientRequestId === clientRequestId;
  });
}

export async function updateOfflineQueueEntry(
  id: string,
  patch: Partial<Pick<OfflineQueueEntry, 'status' | 'lastError' | 'attemptCount'>>,
): Promise<void> {
  const existing = await getOfflineQueueEntry(id);
  if (!existing) {
    return;
  }
  await runOfflineStoreTransaction(OFFLINE_STORES.TRANSACTION_QUEUE, 'readwrite', (store) =>
    store.put({
      ...existing,
      ...patch,
    }),
  );
}

export async function removeOfflineQueueEntry(id: string): Promise<void> {
  await runOfflineStoreTransaction(OFFLINE_STORES.TRANSACTION_QUEUE, 'readwrite', (store) =>
    store.delete(id),
  );
}

/** Test helper — clears all queued entries. */
export async function clearOfflineQueueForTests(): Promise<void> {
  const rows = await listOfflineQueueEntries();
  await Promise.all(rows.map((row) => removeOfflineQueueEntry(row.id)));
}
