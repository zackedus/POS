import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProductsPage from './page';



const authFetchMock = vi.fn();
const masterCatalogState = {
  products: [] as unknown[],
  categories: [] as unknown[],
  units: [{ id: 'u-1', name: 'Kaleng', symbol: 'klg' }],
};



vi.mock('@/lib/api', () => ({

  apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },

}));



vi.mock('@/lib/auth', () => ({

  authFetch: (...args: unknown[]) => authFetchMock(...args),

  fetchMe: vi.fn().mockResolvedValue({

    id: 'manager-1',

    email: 'manager@barokah.local',

    fullName: 'Manager Demo',

    role: 'MANAGER',

    tenantId: 'tenant-1',

    tenantName: 'Barokah',

    outletIds: ['outlet-1'],

  }),

}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    selectedOutletId: 'outlet-1',
    needsOutletPick: false,
  }),
}));

vi.mock('@/lib/inventory-api', () => ({
  fetchInventory: vi.fn().mockResolvedValue({ outletId: 'outlet-1', items: [], lowStockCount: 0, totalCount: 0 }),
  adjustStock: vi.fn(),
}));



function renderProductsPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProductsPage />
    </QueryClientProvider>,
  );
}

function setMasterCatalogState(products: unknown[] = [], categories: unknown[] = []) {
  masterCatalogState.products = products;
  masterCatalogState.categories = categories;
}

function installMasterAuthRouter() {
  authFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.includes('/categories/summary')) {
      return { ok: true, json: async () => ({ success: true, data: masterCatalogState.categories }) };
    }
    if (target.includes('/products?') || target.endsWith('/products')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            items: masterCatalogState.products,
            meta: {
              page: 1,
              limit: 50,
              total: masterCatalogState.products.length,
              totalPages: 1,
            },
          },
        }),
      };
    }
    if (target.match(/\/products\/[^/]+$/) && init?.method === 'PATCH') {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'p-1', sellOnline: false },
        }),
      };
    }
    if (target.includes('/units')) {
      return { ok: true, json: async () => ({ success: true, data: masterCatalogState.units }) };
    }
    throw new Error(`Unhandled authFetch mock: ${target}`);
  });
}

function mockMasterData(products: unknown[] = []) {
  setMasterCatalogState(products, []);
}



describe('ProductsPage', () => {

  beforeEach(() => {
    authFetchMock.mockReset();
    setMasterCatalogState([], []);
    installMasterAuthRouter();
  });



  it('shows error state when products request fails', async () => {

    authFetchMock.mockImplementation(async (url: string) => {
      const target = String(url);
      if (target.includes('/products')) {
        return {
          ok: false,
          json: async () => ({
            success: false,
            error: { message: 'Gagal memuat produk.' },
          }),
        };
      }
      if (target.includes('/units')) {
        return { ok: true, json: async () => ({ success: true, data: masterCatalogState.units }) };
      }
      if (target.includes('/categories/summary')) {
        return { ok: true, json: async () => ({ success: true, data: [] }) };
      }
      throw new Error(`Unhandled authFetch mock: ${target}`);
    });

    renderProductsPage();



    await waitFor(() => {

      expect(screen.getByText('Gagal memproses data produk.')).toBeInTheDocument();

    });

    expect(screen.getByText('Gagal memuat produk.')).toBeInTheDocument();

  });



  it('loads and displays products on success path', async () => {

    mockMasterData([

      { id: 'p-1', sku: 'SMN-001', name: 'Semen Portland', price: 75000, sellOnline: true, unit: { id: 'u-1', name: 'Sak', symbol: 'sak' } },

    ]);



    renderProductsPage();



    expect(await screen.findByText(/Semen Portland/)).toBeInTheDocument();

    expect(screen.getByText(/SMN-001/)).toBeInTheDocument();

    expect(screen.getByText('Online')).toBeInTheDocument();

  });



  it('toggles sellOnline via PATCH when Web Store switch is clicked', async () => {

    mockMasterData([

      { id: 'p-1', sku: 'SMN-001', name: 'Semen Portland', price: 75000, sellOnline: true, unit: { id: 'u-1', name: 'Sak', symbol: 'sak' } },

    ]);



    renderProductsPage();

    const toggle = await screen.findByRole('switch', { name: /Tampil di Web: aktif/i });

    fireEvent.click(toggle);



    await waitFor(() => {

      const patchCall = authFetchMock.mock.calls.find(

        ([url, init]) =>

          typeof url === 'string' &&

          url.endsWith('/products/p-1') &&

          (init as RequestInit | undefined)?.method === 'PATCH' &&

          JSON.parse(String((init as RequestInit).body))?.sellOnline === false,

      );

      expect(patchCall).toBeTruthy();

    });

  });



  it('displays variant parent and child context in product list', async () => {

    mockMasterData([

      {

        id: 'p-parent',

        sku: 'CAT-001',

        name: 'Cat Tembok',

        price: 85000,

        hasVariants: true,

        unit: { id: 'u-1', name: 'Kaleng', symbol: 'klg' },

      },

      {

        id: 'p-child',

        sku: 'CAT-001-P',

        name: 'Cat Tembok Putih',

        price: 90000,

        parentProductId: 'p-parent',

        variantLabel: 'Warna Putih / 5 Liter',

        parentProduct: { id: 'p-parent', name: 'Cat Tembok', sku: 'CAT-001' },

        unit: { id: 'u-1', name: 'Kaleng', symbol: 'klg' },

      },

    ]);



    renderProductsPage();



    expect(await screen.findByText(/Cat Tembok Putih/)).toBeInTheDocument();
    expect(screen.getByText(/CAT-001-P/)).toBeInTheDocument();
    expect(screen.getByText(/Varian dari Cat Tembok/)).toBeInTheDocument();
    expect(screen.getByText(/Warna Putih \/ 5 Liter/)).toBeInTheDocument();

  });



  it('renders product type wizard on create form', async () => {

    mockMasterData([]);



    renderProductsPage();



    expect(await screen.findByText(/Tambah Produk/)).toBeInTheDocument();

    expect(screen.getByText('1. Info dasar')).toBeInTheDocument();

    fireEvent.click(screen.getByText('2. Tipe produk'));

    expect(screen.getAllByText('Sederhana').length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('Multi-satuan').length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText('Induk varian').length).toBeGreaterThanOrEqual(1);

  });



  it('shows bundling and multi-satuan context in product list', async () => {

    mockMasterData([

      {

        id: 'bundle-1',

        sku: 'BND-001',

        name: 'Paket Renovasi Ringan',

        price: 350000,

        unit: { id: 'u-1', name: 'Paket', symbol: 'pkt' },

        sellUnits: [

          { id: 'su-1', name: 'Paket', symbol: 'pkt', conversionQty: 1, price: 350000 },

          { id: 'su-2', name: 'Set', symbol: 'set', conversionQty: 1, price: 175000 },

        ],

        bundleItems: [

          { productId: 'prod-1', sku: 'SMN-001', name: 'Semen', quantity: 2 },

          { productId: 'prod-2', sku: 'CAT-001', name: 'Cat', quantity: 1 },

        ],

      },

    ]);



    renderProductsPage();



    expect(await screen.findByText(/2 satuan jual/)).toBeInTheDocument();

    expect(screen.getByText(/Paket 2 item/)).toBeInTheDocument();

  });



  it('disables submit on preview when required fields missing', async () => {

    mockMasterData([]);



    renderProductsPage();



    await screen.findByText(/Tambah Produk/);

    fireEvent.click(screen.getByText('4. Pratinjau'));

    expect(screen.getByRole('button', { name: /Menyimpan|Tambah produk/ })).toBeDisabled();

  });



  it('does not POST product when navigating wizard steps', async () => {

    mockMasterData([]);



    renderProductsPage();



    await screen.findByText(/Tambah Produk/);



    fireEvent.change(screen.getByLabelText('SKU'), { target: { value: 'TST-001' } });

    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Semen Test' } });

    const priceInput = screen.getByLabelText(/Harga jual/);

    fireEvent.change(priceInput, { target: { value: '75000' } });

    fireEvent.blur(priceInput);



    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    fireEvent.click(screen.getByRole('button', { name: 'Lanjut' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Sebelumnya' })[0]!);



    const postCalls = authFetchMock.mock.calls.filter(

      ([url, init]) =>

        typeof url === 'string' &&

        url.endsWith('/products') &&

        (init as RequestInit | undefined)?.method === 'POST',

    );

    expect(postCalls).toHaveLength(0);

  });

});


