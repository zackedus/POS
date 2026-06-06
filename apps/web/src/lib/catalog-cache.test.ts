import { afterEach, describe, expect, it, vi } from 'vitest';
import { installOfflineIndexedDbMock } from '@/lib/test-indexeddb';
import {
  CATALOG_CACHE_KEY,
  clearCatalogCacheForTests,
  loadCatalogCache,
  saveCatalogCache,
} from './catalog-cache';

describe('catalog-cache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and loads product grid cache', async () => {
    installOfflineIndexedDbMock();
    const products = [{ id: 'p1', name: 'Semen', sku: 'SMN-001', price: 65000 }];
    await saveCatalogCache(products, 'v1');

    const cached = await loadCatalogCache();
    expect(cached?.key).toBe(CATALOG_CACHE_KEY);
    expect(cached?.products).toHaveLength(1);
    expect(cached?.catalogVersion).toBe('v1');

    await clearCatalogCacheForTests();
    const empty = await loadCatalogCache();
    expect(empty).toBeNull();
  });
});
