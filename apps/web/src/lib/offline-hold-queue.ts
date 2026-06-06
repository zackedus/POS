/** IndexedDB queue for offline hold bills (Sprint 12). */

import { OFFLINE_STORES, runOfflineStoreTransaction } from '@/lib/offline-db';
import { createClientRequestId } from '@/lib/offline-queue';

export type OfflineHoldStatus = 'pending' | 'syncing' | 'failed';

export interface OfflineHoldPayload {
  items: Array<{ productId: string; quantity: number; sellUnitId?: string }>;
  label?: string;
  clientRequestId: string;
}

export interface OfflineHoldEntry {
  id: string;
  payload: OfflineHoldPayload;
  status: OfflineHoldStatus;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
}

export async function enqueueOfflineHold(
  input: Omit<OfflineHoldPayload, 'clientRequestId'> & { clientRequestId?: string },
): Promise<OfflineHoldEntry> {
  const clientRequestId = input.clientRequestId ?? createClientRequestId();
  const record: OfflineHoldEntry = {
    id: clientRequestId,
    payload: {
      items: input.items,
      label: input.label,
      clientRequestId,
    },
    status: 'pending',
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  };

  await runOfflineStoreTransaction(OFFLINE_STORES.HOLD_QUEUE, 'readwrite', (store) =>
    store.put(record),
  );
  return record;
}

export async function listOfflineHoldEntries(): Promise<OfflineHoldEntry[]> {
  const rows = await runOfflineStoreTransaction<OfflineHoldEntry[]>(
    OFFLINE_STORES.HOLD_QUEUE,
    'readonly',
    (store) => store.getAll(),
  );
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function listPendingOfflineHolds(): Promise<OfflineHoldEntry[]> {
  const rows = await listOfflineHoldEntries();
  return rows.filter((row) => row.status === 'pending' || row.status === 'failed');
}

export async function countPendingOfflineHolds(): Promise<number> {
  const pending = await listPendingOfflineHolds();
  return pending.length;
}

export async function getOfflineHoldEntry(id: string): Promise<OfflineHoldEntry | undefined> {
  return runOfflineStoreTransaction(OFFLINE_STORES.HOLD_QUEUE, 'readonly', (store) =>
    store.get(id),
  );
}

export async function updateOfflineHoldEntry(
  id: string,
  patch: Partial<Pick<OfflineHoldEntry, 'status' | 'lastError' | 'attemptCount'>>,
): Promise<void> {
  const existing = await getOfflineHoldEntry(id);
  if (!existing) {
    return;
  }
  await runOfflineStoreTransaction(OFFLINE_STORES.HOLD_QUEUE, 'readwrite', (store) =>
    store.put({ ...existing, ...patch }),
  );
}

export async function removeOfflineHoldEntry(id: string): Promise<void> {
  await runOfflineStoreTransaction(OFFLINE_STORES.HOLD_QUEUE, 'readwrite', (store) =>
    store.delete(id),
  );
}

export async function clearOfflineHoldQueueForTests(): Promise<void> {
  const rows = await listOfflineHoldEntries();
  await Promise.all(rows.map((row) => removeOfflineHoldEntry(row.id)));
}
