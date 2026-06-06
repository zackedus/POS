/** AsyncStorage offline queue for mobile POS (Phase 10). */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@barokah/mobile-offline-queue';

export type MobileOfflineKind = 'checkout-cash' | 'hold';

export type MobileOfflineStatus = 'pending' | 'syncing' | 'failed';

export interface MobileOfflineEntry {
  id: string;
  kind: MobileOfflineKind;
  payload: Record<string, unknown>;
  status: MobileOfflineStatus;
  createdAt: string;
  attemptCount: number;
  lastError?: string;
}

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

const memoryStore = new Map<string, string>();

function createMemoryAdapter(): StorageAdapter {
  return {
    getItem: async (key) => memoryStore.get(key) ?? null,
    setItem: async (key, value) => {
      memoryStore.set(key, value);
    },
  };
}

let storageOverride: StorageAdapter | null = null;

function getStorage(): StorageAdapter {
  if (storageOverride) {
    return storageOverride;
  }
  if (typeof window === 'undefined') {
    return createMemoryAdapter();
  }
  return AsyncStorage;
}

export function setMobileOfflineStorageForTests(adapter: StorageAdapter | null): void {
  storageOverride = adapter;
  memoryStore.clear();
}

export function createClientRequestId(): string {
  return `mobile-offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<MobileOfflineEntry[]> {
  const raw = await getStorage().getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as MobileOfflineEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: MobileOfflineEntry[]): Promise<void> {
  await getStorage().setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueueMobileOffline(
  entry: Omit<MobileOfflineEntry, 'status' | 'createdAt' | 'attemptCount'> & {
    status?: MobileOfflineStatus;
    createdAt?: string;
    attemptCount?: number;
  },
): Promise<MobileOfflineEntry> {
  const record: MobileOfflineEntry = {
    ...entry,
    status: entry.status ?? 'pending',
    createdAt: entry.createdAt ?? new Date().toISOString(),
    attemptCount: entry.attemptCount ?? 0,
  };
  const rows = await readAll();
  rows.push(record);
  await writeAll(rows);
  return record;
}

export async function listPendingMobileOffline(): Promise<MobileOfflineEntry[]> {
  const rows = await readAll();
  return rows.filter((row) => row.status === 'pending' || row.status === 'failed');
}

export async function countPendingMobileOffline(): Promise<number> {
  const pending = await listPendingMobileOffline();
  return pending.length;
}

export async function updateMobileOfflineEntry(
  id: string,
  patch: Partial<Pick<MobileOfflineEntry, 'status' | 'lastError' | 'attemptCount'>>,
): Promise<void> {
  const rows = await readAll();
  const next = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
  await writeAll(next);
}

export async function removeMobileOfflineEntry(id: string): Promise<void> {
  const rows = await readAll();
  await writeAll(rows.filter((row) => row.id !== id));
}

export async function clearMobileOfflineForTests(): Promise<void> {
  setMobileOfflineStorageForTests(createMemoryAdapter());
  await writeAll([]);
}
