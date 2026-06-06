import { vi } from 'vitest';
import { OFFLINE_DB_NAME, OFFLINE_DB_VERSION, OFFLINE_STORES } from '@/lib/offline-db';

type StoreRecord = Record<string, unknown>;

export function installOfflineIndexedDbMock() {
  const stores = new Map<string, Map<string, StoreRecord>>();
  const createdStores = new Set<string>();

  for (const name of Object.values(OFFLINE_STORES)) {
    stores.set(name, new Map());
  }

  function getStore(name: string) {
    if (!stores.has(name)) {
      stores.set(name, new Map());
    }
    return stores.get(name) as Map<string, StoreRecord>;
  }

  function objectStore(name: string) {
    const store = getStore(name);
    return {
      put(value: StoreRecord) {
        const key = String(value.id ?? value.key);
        store.set(key, value);
        return Promise.resolve(value);
      },
      get(key: string) {
        return Promise.resolve(store.get(key));
      },
      getAll() {
        return Promise.resolve([...store.values()]);
      },
      delete(key: string) {
        store.delete(key);
        return Promise.resolve(undefined);
      },
    };
  }

  const mockDb = {
    objectStoreNames: {
      contains: (name: string) => createdStores.has(name),
    },
    createObjectStore: (name: string) => {
      createdStores.add(name);
      return objectStore(name);
    },
    transaction: (name: string) => {
      const tx = {
        objectStore: () => objectStore(name),
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null,
      };
      queueMicrotask(() => tx.oncomplete?.());
      return tx;
    },
    close: vi.fn(),
  };

  const openRequest = {
    result: mockDb as unknown as IDBDatabase,
    error: null,
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
  };

  vi.stubGlobal('indexedDB', {
    open: (dbName: string, version?: number) => {
      if (dbName !== OFFLINE_DB_NAME || version !== OFFLINE_DB_VERSION) {
        throw new Error(`Unexpected IndexedDB open: ${dbName} v${version}`);
      }
      queueMicrotask(() => {
        openRequest.onupgradeneeded?.();
        openRequest.onsuccess?.();
      });
      return openRequest;
    },
  });

  return stores;
}
