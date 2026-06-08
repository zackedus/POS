import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PosPage from './page';

function renderPosPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PosPage />
    </QueryClientProvider>,
  );
}

function setCatalogState(products: unknown[], held: unknown[] = [], categories: unknown[] = []) {
  catalogState.products = products;
  catalogState.held = held;
  catalogState.categories = categories;
}

type AuthFetchResult = { ok: boolean; json: () => Promise<unknown> };

type AuthFetchOverride = {
  match: (url: string, init?: RequestInit) => boolean;
  respond: (url: string, init?: RequestInit) => AuthFetchResult | Promise<AuthFetchResult>;
};

const authFetchOverrides: AuthFetchOverride[] = [];

function queueAuthFetchOverride(override: AuthFetchOverride) {
  authFetchOverrides.push(override);
}

function installCatalogAuthRouter() {
  authFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const target = String(url);
    const method = init?.method ?? 'GET';

    const overrideIndex = authFetchOverrides.findIndex((entry) => entry.match(target, init));
    if (overrideIndex >= 0) {
      const [override] = authFetchOverrides.splice(overrideIndex, 1);
      return override.respond(target, init);
    }

    if (target.includes('/categories/summary')) {
      return { ok: true, json: async () => ({ success: true, data: catalogState.categories }) };
    }
    if (target.includes('/products/grid')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { items: catalogState.products, total: catalogState.products.length },
        }),
      };
    }
    if (target.includes('/transactions/held') && method === 'GET' && !target.includes('/transactions/held/')) {
      return { ok: true, json: async () => ({ success: true, data: catalogState.held }) };
    }
    throw new Error(`Unhandled authFetch mock: ${method} ${target}`);
  });
}

const authFetchMock = vi.fn();
const fetchMeMock = vi.fn();
const catalogState = {
  products: [] as unknown[],
  held: [] as unknown[],
  categories: [] as unknown[],
};

const fetchRecentTransactionsMock = vi.fn();
const fetchTransactionReceiptMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/pos',
}));

vi.mock('@/lib/api', () => ({
  apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
}));

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
  tokenStorage: { clear: vi.fn() },
}));

vi.mock('@/lib/transactions', () => ({
  fetchRecentTransactions: (...args: unknown[]) => fetchRecentTransactionsMock(...args),
  fetchTransactionReceipt: (...args: unknown[]) => fetchTransactionReceiptMock(...args),
  TransactionApiError: class TransactionApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@/lib/thermal-print', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/thermal-print')>();
  return {
    ...actual,
    printReceiptBrowser: vi.fn(),
  };
});

const syncNowMock = vi.fn().mockResolvedValue({ synced: [], failed: [] });
const queueCashCheckoutMock = vi.fn().mockResolvedValue('offline-req-1');
const queueSplitCheckoutMock = vi.fn().mockResolvedValue('offline-req-2');

vi.mock('@/hooks/useOfflinePos', () => ({
  useOfflinePos: () => ({
    isOnline: true,
    pendingCount: 0,
    pendingHoldCount: 0,
    conflictCount: 0,
    conflicts: [],
    dismissedConflictIds: [],
    syncing: false,
    syncMessage: null,
    syncNow: syncNowMock,
    resolveConflict: vi.fn(),
    queueCashCheckout: queueCashCheckoutMock,
    queueSplitCheckout: queueSplitCheckoutMock,
    queueHoldBill: vi.fn(),
    refreshPendingCount: vi.fn(),
    refreshConflicts: vi.fn(),
  }),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'outlet-1', label: 'Cabang Utama (MAIN)' }],
    selectedOutletId: 'outlet-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/lib/shifts-api', () => ({
  fetchActiveShift: vi.fn().mockResolvedValue({
    id: 'shift-1',
    openingCash: 100_000,
    openedAt: '2026-06-02T08:00:00.000Z',
  }),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/useOnlineOrderBadge', () => ({
  ONLINE_ORDERS_POLL_MS: 15_000,
  useOnlineOrderBadge: () => 0,
}));

vi.mock('@/lib/catalog-cache', () => ({
  loadCatalogCache: vi.fn(),
  saveCatalogCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/cart-margin', () => ({
  fetchCartMarginWarnings: vi.fn().mockResolvedValue([]),
  fetchCartValidation: vi.fn().mockResolvedValue({
    marginWarnings: [],
    stockIssues: [],
    hasInsufficientStock: false,
  }),
}));

const fetchCustomersMock = vi.fn();
const lookupCustomerByPhoneMock = vi.fn();
const lookupCustomerByMemberCodeMock = vi.fn();
const fetchCustomerFinanceSummaryMock = vi.fn();
const fetchCustomerAddressesMock = vi.fn();
const createDeliveryOrderMock = vi.fn();

vi.mock('@/lib/customers-api', () => ({
  fetchCustomers: (...args: unknown[]) => fetchCustomersMock(...args),
  lookupCustomerByPhone: (...args: unknown[]) => lookupCustomerByPhoneMock(...args),
  lookupCustomerByMemberCode: (...args: unknown[]) => lookupCustomerByMemberCodeMock(...args),
  fetchCustomerFinanceSummaryFromCustomers: (...args: unknown[]) =>
    fetchCustomerFinanceSummaryMock(...args),
  fetchCustomerAddresses: (...args: unknown[]) => fetchCustomerAddressesMock(...args),
}));

vi.mock('@/lib/deliveries-api', () => ({
  createDeliveryOrder: (...args: unknown[]) => createDeliveryOrderMock(...args),
}));

const sampleCustomer = {
  id: 'cust-1',
  name: 'Pak Budi',
  phone: '081234567890',
  memberCode: 'MBR-001',
  points: 120,
  updatedAt: '2026-06-02T08:00:00.000Z',
  creditLimit: 1_000_000,
  receivableOutstanding: 200_000,
  depositBalance: 50_000,
  creditAvailable: 800_000,
};

function mockReceiptResponse(id: string, receiptNo: string) {
  return {
    receipt: {
      receiptNo,
      transactionId: id,
      outlet: { id: 'outlet-1', name: 'Toko', code: 'TK', address: null },
      tenantName: 'Barokah',
      cashier: { id: 'cashier-1', fullName: 'Kasir A' },
      status: 'COMPLETED',
      items: [],
      payments: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      notes: null,
      completedAt: '2026-06-02T10:00:00.000Z',
      adjustments: [],
      refundedTotal: 0,
      netTotal: 0,
    },
    escpos: {
      format: 'escpos',
      encoding: 'base64',
      width: 32,
      payload: 'dGVzdA==',
      commands: ['INIT', 'TEXT', 'CUT'],
    },
  };
}

describe('PosPage', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    authFetchOverrides.length = 0;
    setCatalogState([], [], []);
    installCatalogAuthRouter();
    fetchMeMock.mockReset();
    fetchRecentTransactionsMock.mockReset();
    fetchTransactionReceiptMock.mockReset();
    replaceMock.mockReset();
    fetchRecentTransactionsMock.mockResolvedValue([]);
    fetchTransactionReceiptMock.mockResolvedValue(mockReceiptResponse('trx-1', 'TRX-001'));
    fetchMeMock.mockResolvedValue({
      id: 'cashier-1',
      email: 'cashier@barokah.local',
      fullName: 'Kasir A',
      role: 'CASHIER',
      tenantId: 'tenant-1',
      tenantName: 'Barokah',
      outletIds: ['outlet-1'],
    });
    fetchCustomersMock.mockResolvedValue([sampleCustomer]);
    lookupCustomerByPhoneMock.mockResolvedValue(null);
    lookupCustomerByMemberCodeMock.mockResolvedValue(null);
    fetchCustomerFinanceSummaryMock.mockResolvedValue({
      customer: { id: 'cust-1', name: 'Pak Budi', phone: '081234567890', creditLimit: 1_000_000 },
      finance: {
        receivableOutstanding: 270_000,
        depositBalance: 0,
        creditLimit: 1_000_000,
        creditAvailable: 730_000,
      },
      receivables: [],
      deposit: null,
    });
    fetchCustomerAddressesMock.mockResolvedValue([
      {
        id: 'addr-1',
        label: 'Proyek',
        addressLine1: 'Jl. Merdeka 10',
        addressLine2: null,
        city: 'Jakarta',
        province: 'DKI',
        postalCode: null,
        isDefault: true,
        createdAt: '2026-06-02T08:00:00.000Z',
        updatedAt: '2026-06-02T08:00:00.000Z',
      },
    ]);
    createDeliveryOrderMock.mockResolvedValue({ deliveryNo: 'DLV-20260609-0001' });
  });

  it('supports product search and hold/recall happy path', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
      { id: 'prod-2', name: 'Cat Tembok', sku: 'CAT-002', price: 50000, unit: { name: 'Kaleng', symbol: 'kaleng' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/hold') && init?.method === 'POST',
      respond: () => {
        catalogState.held = [
          {
            id: 'hold-1',
            label: 'Hold 14:00',
            total: 70000,
            itemCount: 1,
            expiresAt: '2026-06-02T10:00:00.000Z',
          },
        ];
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'hold-1',
              label: 'Hold 14:00',
              total: 70000,
              items: [{ productId: 'prod-1', name: 'Semen Portland', price: 70000, quantity: 1 }],
            },
          }),
        };
      },
    });
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/held/hold-1') && init?.method === 'DELETE',
      respond: () => {
        catalogState.held = [];
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'hold-1',
              label: 'Hold 14:00',
              total: 70000,
              items: [{ productId: 'prod-1', name: 'Semen Portland', price: 70000, quantity: 1 }],
            },
          }),
        };
      },
    });

    renderPosPage();

    expect(await screen.findByText('Semen Portland')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Cari nama / SKU…'), { target: { value: 'cat' } });
    expect(screen.queryByText('Semen Portland')).not.toBeInTheDocument();
    expect(screen.getByText('Cat Tembok')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Cari nama / SKU…'), { target: { value: 'semen' } });
    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hold' }));

    await waitFor(() => {
      expect(screen.getByText('Hold berhasil disimpan. Lanjutkan dari panel Daftar Hold kapan saja.')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Daftar Hold/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Recall' }));
    await waitFor(() => {
      expect(screen.getByText('Recall berhasil. Item hold sudah kembali ke keranjang dan siap checkout.')).toBeInTheDocument();
    });
  });

  it('supports split payment checkout with cash and transfer', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 125000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'trx-split-1',
            receiptNo: 'TRX-SPLIT-01',
            total: 125000,
            payments: { CASH: 50000, TRANSFER: 75000 },
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    fireEvent.change(screen.getByLabelText('Nominal Tunai'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Nominal Transfer'), { target: { value: '75000' } });
    fireEvent.change(screen.getByLabelText('Referensi transfer (opsional)'), { target: { value: 'TRF-001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Split' }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout split berhasil/i)).toBeInTheDocument();
    });
  });

  it('completes QRIS checkout via mock polling', async () => {
    setCatalogState([
      { id: 'prod-cat-25l', name: 'Cat Tembok Interior — 25 Liter', sku: 'CAT-25L', price: 332500, unit: { name: 'Liter', symbol: 'L' } },
    ]);

    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/qris/initiate') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            paymentId: 'QRIS-TEST-1',
            status: 'PENDING',
            amount: 332500,
            qrPayload: 'ID.QRIS.MOCK|QRIS-TEST-1|332500|BAROKAH-CORE-POS',
            mockAutoConfirmMs: 3000,
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
          },
        }),
      }),
    });

    queueAuthFetchOverride({
      match: (url) => url.includes('/transactions/qris/QRIS-TEST-1/status'),
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            paymentId: 'QRIS-TEST-1',
            status: 'PAID',
            amount: 332500,
            qrPayload: 'ID.QRIS.MOCK|QRIS-TEST-1|332500|BAROKAH-CORE-POS',
            transactionId: 'trx-qris-1',
            receiptNo: 'TRX-QRIS-1',
            total: 332500,
            expiresAt: new Date(Date.now() + 900_000).toISOString(),
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Cat Tembok Interior/i }));
    fireEvent.click(screen.getByRole('button', { name: 'QRIS' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Checkout QRIS' })).not.toBeDisabled();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout QRIS' }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout QRIS berhasil \(TRX-QRIS-1\)/i)).toBeInTheDocument();
    });
  });

  it('opens unit picker for multi-satuan products and adds selected unit', async () => {
    setCatalogState([
      {
        id: 'prod-multi',
        name: 'Paket Renovasi Ringan',
        sku: 'BND-001',
        price: 300000,
        unit: { name: 'Paket', symbol: 'pkt' },
        sellUnits: [
          { id: 'su-1', name: 'Paket', symbol: 'pkt', conversionToBase: 1, price: 300000, isDefault: true },
          { id: 'su-2', name: 'Set', symbol: 'set', conversionToBase: 1, price: 150000 },
        ],
        isBundle: true,
      },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Paket Renovasi Ringan/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Pilih satuan jual/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Set \(set\)/i }));
    expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sinkron policy bundle/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Policy: Outlet/i)).not.toBeInTheDocument();
  });
  it('shows split payment mismatch hint and prevents submit', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 125000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    fireEvent.change(screen.getByLabelText('Nominal Tunai'), { target: { value: '50000' } });

    const checkoutSplitButton = screen.getByRole('button', { name: 'Checkout Split' });
    expect(checkoutSplitButton).toBeDisabled();
    expect(screen.getByText(/Total split harus sama dengan total keranjang/i)).toBeInTheDocument();
    expect(authFetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(fetchRecentTransactionsMock).toHaveBeenCalled();
  });

  it('shows retry action when split checkout fails and succeeds on retry', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 125000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: () => ({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Stok tidak cukup untuk Semen Portland. Tersedia: 0 sak, diminta: 1 sak.',
          },
        }),
      }),
    });
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'trx-split-2',
            receiptNo: 'TRX-SPLIT-02',
            total: 125000,
            payments: { CASH: 50000, TRANSFER: 75000 },
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    fireEvent.change(screen.getByLabelText('Nominal Tunai'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Nominal Transfer'), { target: { value: '75000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Split' }));

    await waitFor(() => {
      expect(screen.getByText(/Stok tidak cukup untuk Semen Portland/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Coba Lagi Split Terakhir' }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout split berhasil/i)).toBeInTheDocument();
    });
  });

  it('maps split payment duplicated method error to operational message', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 125000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: () => ({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'PAYMENT_METHOD_DUPLICATED', message: 'Method duplicated.' },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    fireEvent.change(screen.getByLabelText('Nominal Tunai'), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText('Nominal Transfer'), { target: { value: '75000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Split' }));

    await waitFor(() => {
      expect(
        screen.getByText(/Metode pembayaran split tidak boleh duplikat. Gunakan kombinasi metode yang berbeda./i),
      ).toBeInTheDocument();
    });
  });

  it('normalizes decimal-like split input to integer and blocks mismatch checkout', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 125000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Split' }));
    fireEvent.change(screen.getByLabelText('Nominal Tunai'), { target: { value: '50.000,5' } });
    fireEvent.change(screen.getByLabelText('Nominal Transfer'), { target: { value: '74500' } });

    expect(screen.getByRole('button', { name: 'Checkout Split' })).toBeDisabled();
    expect(screen.getByText(/Total split harus sama dengan total keranjang/i)).toBeInTheDocument();
  });

  it('shows formatted stock badges for paku and seng products', async () => {
    setCatalogState([
      {
        id: 'prod-paku',
        name: 'Paku 2"',
        sku: 'PKU-002',
        price: 45000,
        stockQty: 197.5,
        unit: { id: 'unit-kg', name: 'Kilogram', symbol: 'kg' },
      },
      {
        id: 'prod-seng',
        name: 'Seng Galvalum',
        sku: 'SNG-001',
        price: 120000,
        stockQty: 87.5,
        unit: { id: 'unit-m', name: 'Meter', symbol: 'm' },
        sellUnits: [
          { id: 'unit-m', name: 'Meter', symbol: 'm', conversionToBase: 1, price: 120000, isDefault: false },
          { id: 'unit-roll', name: 'Roll', symbol: 'roll', conversionToBase: 50, price: 6000000, isDefault: true },
        ],
      },
      {
        id: 'prod-empty',
        name: 'Semen Portland',
        sku: 'SMN-001',
        price: 70000,
        stockQty: 0,
        unit: { id: 'unit-sak', name: 'Sak', symbol: 'sak' },
      },
    ]);

    renderPosPage();

    expect(await screen.findByText('197,5 kg')).toBeInTheDocument();
    expect(screen.getByText('87,5 m')).toBeInTheDocument();
    expect(screen.getByText('Habis')).toBeInTheDocument();
    expect(screen.queryByText('≈ 1,75 roll')).not.toBeInTheDocument();
  });

  it('shows cart available stock and blocks add when stock is empty', async () => {
    setCatalogState([
      {
        id: 'prod-paku',
        name: 'Paku 2"',
        sku: 'PKU-002',
        price: 45000,
        stockQty: 12.5,
        unit: { id: 'unit-kg', name: 'Kilogram', symbol: 'kg' },
      },
      {
        id: 'prod-empty',
        name: 'Semen Portland',
        sku: 'SMN-001',
        price: 70000,
        stockQty: 0,
        unit: { id: 'unit-sak', name: 'Sak', symbol: 'sak' },
      },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Paku 2"/i }));

    expect(screen.getByText('Tersedia: 12,5 kg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Semen Portland/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Semen Portland habis|Stok Semen Portland habis/i).length).toBeGreaterThan(0);
    });
  });

  it('shows network retry feedback for hold action', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/hold') && init?.method === 'POST',
      respond: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/hold') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'hold-1',
            label: 'Hold 14:00',
            total: 70000,
            items: [{ productId: 'prod-1', name: 'Semen Portland', price: 70000, quantity: 1 }],
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hold' }));

    await waitFor(() => {
      expect(screen.getByText(/Koneksi jaringan bermasalah/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Retry Hold' }));

    await waitFor(() => {
      expect(screen.getByText('Hold berhasil disimpan. Lanjutkan dari panel Daftar Hold kapan saja.')).toBeInTheDocument();
    });
  });

  it('opens customer picker when tempo is selected without linked customer', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tempo' }));

    expect(await screen.findByRole('dialog', { name: /Pilih pelanggan — bayar tempo/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(fetchCustomersMock).toHaveBeenCalled();
    });
  });

  it('completes tempo checkout after customer is selected', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          payments?: Array<{ method: string; amount: number }>;
          customerId?: string;
        };
        expect(body.customerId).toBe('cust-1');
        expect(body.payments).toEqual([{ method: 'CREDIT', amount: 70000 }]);
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'trx-credit-1',
              receiptNo: 'TRX-TEMPO-01',
              total: 70000,
              payments: { CREDIT: 70000 },
            },
          }),
        };
      },
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Tempo' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pak Budi/i }));
    fireEvent.click(screen.getByRole('button', { name: /Checkout Tempo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout tempo berhasil/i)).toBeInTheDocument();
    });
    expect(fetchCustomerFinanceSummaryMock).toHaveBeenCalledWith('cust-1');
  });

  it('offers deposit plus tempo when deposit balance is insufficient', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 120000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-split') && init?.method === 'POST',
      respond: (_url, init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as {
          payments?: Array<{ method: string; amount: number }>;
        };
        expect(body.payments).toEqual([
          { method: 'DEPOSIT', amount: 50_000 },
          { method: 'CREDIT', amount: 70_000 },
        ]);
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 'trx-mix-1',
              receiptNo: 'TRX-MIX-01',
              total: 120000,
              payments: { DEPOSIT: 50_000, CREDIT: 70_000 },
            },
          }),
        };
      },
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Deposit' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pak Budi/i }));

    expect(screen.getByText(/kurang/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Deposit.*Tempo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Checkout deposit \+ tempo berhasil/i)).toBeInTheDocument();
    });
  });

  it('creates delivery queue after cash checkout with kirim ke alamat', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-cash') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'trx-dlv-1',
            receiptNo: 'TRX-DLV-01',
            total: 70000,
            cashReceived: 100000,
            change: 30000,
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih Pelanggan' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pak Budi/i }));
    await waitFor(() => {
      expect(screen.getByText('Terdaftar')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke alamat' }));

    await waitFor(() => {
      expect(fetchCustomerAddressesMock).toHaveBeenCalledWith('cust-1');
      expect(screen.getByRole('combobox', { name: 'Pilih alamat tersimpan' })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Tunai diterima (IDR)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Tunai' }));

    await waitFor(() => {
      expect(createDeliveryOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'trx-dlv-1',
          customerId: 'cust-1',
          addressId: 'addr-1',
        }),
      );
      expect(screen.getByText(/Masuk antrian pengiriman DLV-20260609-0001/i)).toBeInTheDocument();
    });
  });

  it('shows walk-in badge and delivery hint until name and phone filled', async () => {
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));

    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    expect(screen.getByText(/Isi nama \(min\. 2 karakter\) dan no\. HP untuk opsi kirim/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kirim ke alamat' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nama pelanggan'), { target: { value: 'Pak Joko' } });
    fireEvent.change(screen.getByLabelText('No. HP pelanggan'), { target: { value: '0812987654321' } });

    expect(await screen.findByRole('button', { name: 'Kirim ke alamat' })).toBeInTheDocument();
  });

  it('creates delivery queue after walk-in cash checkout with manual address', async () => {
    lookupCustomerByPhoneMock.mockResolvedValue(null);
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-cash') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'trx-walkin-dlv-1',
            receiptNo: 'TRX-WLK-01',
            total: 70000,
            cashReceived: 100000,
            change: 30000,
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.change(screen.getByLabelText('Nama pelanggan'), { target: { value: 'Pak Joko' } });
    fireEvent.change(screen.getByLabelText('No. HP pelanggan'), { target: { value: '0812987654321' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Kirim ke alamat' }));

    fireEvent.change(await screen.findByLabelText('Alamat lengkap pengiriman'), {
      target: { value: 'Jl. Merdeka 10' },
    });
    fireEvent.change(screen.getByLabelText('Kota pengiriman'), { target: { value: 'Jakarta' } });
    fireEvent.change(screen.getByLabelText('Tunai diterima (IDR)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Tunai' }));

    await waitFor(() => {
      expect(createDeliveryOrderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionId: 'trx-walkin-dlv-1',
          customerName: 'Pak Joko',
          customerPhone: '0812987654321',
          addressSnapshot: expect.objectContaining({
            addressLine1: 'Jl. Merdeka 10',
            city: 'Jakarta',
          }),
        }),
      );
      expect(screen.getByText(/Masuk antrian pengiriman DLV-20260609-0001/i)).toBeInTheDocument();
    });
  });

  it('shows error when delivery queue creation fails after successful checkout', async () => {
    createDeliveryOrderMock.mockRejectedValue(new Error('Pelanggan wajib dipilih untuk pengiriman.'));
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);
    queueAuthFetchOverride({
      match: (url, init) => url.includes('/transactions/checkout-cash') && init?.method === 'POST',
      respond: () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'trx-dlv-fail-1',
            receiptNo: 'TRX-DLV-FAIL',
            total: 70000,
            cashReceived: 100000,
            change: 30000,
          },
        }),
      }),
    });

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih Pelanggan' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pak Budi/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Kirim ke alamat' }));
    await waitFor(() => {
      expect(fetchCustomerAddressesMock).toHaveBeenCalledWith('cust-1');
      expect(screen.getByRole('combobox', { name: 'Pilih alamat tersimpan' })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Tunai diterima (IDR)'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Tunai' }));

    await waitFor(() => {
      expect(createDeliveryOrderMock).toHaveBeenCalled();
      expect(screen.getByText(/Checkout berhasil \(TRX-DLV-FAIL\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pelanggan wajib dipilih untuk pengiriman/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Masuk antrian pengiriman/i)).not.toBeInTheDocument();
  });

  it('keeps registered customer after picker when API stores 62-prefixed phone', async () => {
    const customerStored62 = {
      ...sampleCustomer,
      phone: '6281234567890',
    };
    fetchCustomersMock.mockResolvedValue([customerStored62]);
    lookupCustomerByPhoneMock.mockResolvedValue(customerStored62);
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Pilih Pelanggan' }));
    fireEvent.click(await screen.findByRole('button', { name: /Pak Budi/i }));

    await waitFor(() => {
      expect(screen.getByText('Terdaftar')).toBeInTheDocument();
    });
    expect(screen.queryByText(/No\. HP belum terdaftar/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('No. HP pelanggan')).toHaveValue('081234567890');
  });

  it('shows walk-in phone hint only for valid unregistered mobile numbers', async () => {
    lookupCustomerByPhoneMock.mockResolvedValue(null);
    setCatalogState([
      { id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 70000, unit: { name: 'Sak', symbol: 'sak' } },
    ]);

    renderPosPage();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.change(screen.getByLabelText('No. HP pelanggan'), {
      target: { value: '62987383787334' },
    });

    await waitFor(() => {
      expect(screen.getByText('Walk-in')).toBeInTheDocument();
    });
    expect(screen.queryByText(/No\. HP belum terdaftar/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('No. HP pelanggan'), {
      target: { value: '0812987654321' },
    });

    expect(
      await screen.findByText(/Checkout tunai\/transfer\/QRIS tetap bisa/i),
    ).toBeInTheDocument();
  });
});

