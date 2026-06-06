import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearOfflineQueueForTests,
  countPendingOfflineTransactions,
  createClientRequestId,
  enqueueOfflineTransaction,
  OFFLINE_STORE_NAME,
} from './offline-queue';

type StoreRecord = Record<string, unknown>;

function installIndexedDbMock() {
  const store = new Map<string, StoreRecord>();
  let storeCreated = false;

  const objectStore = {
    put(value: StoreRecord) {
      store.set(String(value.id), value);
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

  const mockDb = {
    objectStoreNames: {
      contains: (name: string) => name === OFFLINE_STORE_NAME && storeCreated,
    },
    createObjectStore: () => {
      storeCreated = true;
      return objectStore;
    },
    transaction: () => {
      const tx = {
        objectStore: () => objectStore,
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
    open: () => {
      queueMicrotask(() => {
        if (openRequest.onupgradeneeded) {
          openRequest.onupgradeneeded();
        }
        openRequest.onsuccess?.();
      });
      return openRequest;
    },
  });

  return store;
}

describe('offline-queue', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates client request id', () => {
    const id = createClientRequestId();
    expect(id.length).toBeGreaterThan(8);
  });

  it('enqueues and counts pending transactions', async () => {
    installIndexedDbMock();
    const id = createClientRequestId();
    await enqueueOfflineTransaction({
      id,
      kind: 'checkout-cash',
      payload: {
        clientRequestId: id,
        items: [{ productId: 'prod-1', quantity: 2 }],
        cashReceived: 50000,
      },
    });

    const count = await countPendingOfflineTransactions();
    expect(count).toBe(1);

    await clearOfflineQueueForTests();
    const afterClear = await countPendingOfflineTransactions();
    expect(afterClear).toBe(0);
  });
});
