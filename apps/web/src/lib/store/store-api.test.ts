import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
  };
});

describe('store-api payload mapping', () => {
  it('maps catalog product stock status', async () => {
    const { fetchProducts } = await import('./store-api');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            {
              id: 'p1',
              name: 'Semen',
              sku: 'SMN-40',
              unitSymbol: 'sak',
              price: 65000,
              imageUrl: null,
              placeholderKey: 'generic-building',
              stockStatus: 'AVAILABLE',
              moq: 1,
              orderStep: 1,
            },
          ],
          meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchProducts('toko-a', { outletId: 'outlet-1' });
    expect(items.items[0]?.stockStatus).toBe('AVAILABLE');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/store/toko-a/catalog/products?outletId=outlet-1',
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });
});
