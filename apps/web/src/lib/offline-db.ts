/** Shared IndexedDB for offline POS (Sprint 11–12). */

export const OFFLINE_DB_NAME = 'barokah-pos-offline';
export const OFFLINE_DB_VERSION = 2;

export const OFFLINE_STORES = {
  TRANSACTION_QUEUE: 'transaction-queue',
  HOLD_QUEUE: 'hold-queue',
  CATALOG: 'catalog',
  META: 'meta',
} as const;

export type OfflineStoreName = (typeof OFFLINE_STORES)[keyof typeof OFFLINE_STORES];

function isIndexedDbRequest(value: unknown): value is IDBRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'onsuccess' in value &&
    'result' in value
  );
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di lingkungan ini.'));
      return;
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onerror = () => {
      reject(request.error ?? new Error('Gagal membuka IndexedDB.'));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORES.TRANSACTION_QUEUE)) {
        db.createObjectStore(OFFLINE_STORES.TRANSACTION_QUEUE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORES.HOLD_QUEUE)) {
        db.createObjectStore(OFFLINE_STORES.HOLD_QUEUE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORES.CATALOG)) {
        db.createObjectStore(OFFLINE_STORES.CATALOG, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(OFFLINE_STORES.META)) {
        db.createObjectStore(OFFLINE_STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export function runOfflineStoreTransaction<T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  return openOfflineDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);

        Promise.resolve(work(store))
          .then((result) => {
            if (isIndexedDbRequest(result)) {
              result.onsuccess = () => resolve(result.result as T);
              result.onerror = () => reject(result.error ?? new Error('Operasi IndexedDB gagal.'));
            } else {
              resolve(result as T);
            }
          })
          .catch(reject);

        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          reject(tx.error ?? new Error('Transaksi IndexedDB gagal.'));
          db.close();
        };
      }),
  );
}
