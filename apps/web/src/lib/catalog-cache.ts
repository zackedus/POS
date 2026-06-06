/** Product grid cache for offline browse (read-only spike — Sprint 12). */

import { OFFLINE_STORES, runOfflineStoreTransaction } from '@/lib/offline-db';

export const CATALOG_CACHE_KEY = 'products-grid';

export interface CatalogProductRow {
  id: string;
  name: string;
  sku: string;
  price: number;
  moq?: number;
  orderStep?: number;
  unit?: { name: string; symbol: string } | null;
  sellUnits?: Array<{
    id: string;
    name: string;
    symbol: string;
    conversionToBase: number;
    price: number;
    sellStep?: number;
    minQty?: number;
  }>;
  bundleItems?: Array<{
    productId: string;
    sku?: string;
    name?: string;
    quantity: number;
  }>;
  bundlePolicy?: Record<string, unknown> | null;
  outletBehavior?: Record<string, unknown> | null;
}

export interface CatalogCacheRecord {
  key: string;
  products: CatalogProductRow[];
  catalogVersion: string;
  fetchedAt: string;
}

export async function saveCatalogCache(
  products: CatalogProductRow[],
  catalogVersion?: string,
): Promise<CatalogCacheRecord> {
  const record: CatalogCacheRecord = {
    key: CATALOG_CACHE_KEY,
    products,
    catalogVersion: catalogVersion ?? new Date().toISOString(),
    fetchedAt: new Date().toISOString(),
  };
  await runOfflineStoreTransaction(OFFLINE_STORES.CATALOG, 'readwrite', (store) =>
    store.put(record),
  );
  await runOfflineStoreTransaction(OFFLINE_STORES.META, 'readwrite', (store) =>
    store.put({
      key: 'catalogVersion',
      value: record.catalogVersion,
      updatedAt: record.fetchedAt,
    }),
  );
  return record;
}

export async function loadCatalogCache(): Promise<CatalogCacheRecord | null> {
  const record = await runOfflineStoreTransaction<CatalogCacheRecord | undefined>(
    OFFLINE_STORES.CATALOG,
    'readonly',
    (store) => store.get(CATALOG_CACHE_KEY),
  );
  return record ?? null;
}

export async function clearCatalogCacheForTests(): Promise<void> {
  await runOfflineStoreTransaction(OFFLINE_STORES.CATALOG, 'readwrite', (store) =>
    store.delete(CATALOG_CACHE_KEY),
  );
}
