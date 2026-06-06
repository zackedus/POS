import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PosPage from './page';

const authFetchMock = vi.fn();
const fetchMeMock = vi.fn();
const fetchRecentTransactionsMock = vi.fn();
const queueCashCheckoutMock = vi.fn().mockResolvedValue('offline-cash-req-99');

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
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
  fetchTransactionReceipt: vi.fn(),
  TransactionApiError: class TransactionApiError extends Error {},
}));

vi.mock('@/lib/thermal-print', () => ({
  printReceiptBrowser: vi.fn(),
}));

vi.mock('@/lib/catalog-cache', () => ({
  loadCatalogCache: vi.fn().mockResolvedValue({
    key: 'products-grid',
    products: [{ id: 'prod-1', name: 'Semen Portland', sku: 'SMN-001', price: 65000 }],
    catalogVersion: 'v1',
    fetchedAt: '2026-06-02T10:00:00.000Z',
  }),
  saveCatalogCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/useOfflinePos', () => ({
  useOfflinePos: () => ({
    isOnline: false,
    pendingCount: 1,
    pendingHoldCount: 0,
    conflictCount: 0,
    conflicts: [],
    dismissedConflictIds: [],
    syncing: false,
    syncMessage: null,
    syncNow: vi.fn(),
    resolveConflict: vi.fn(),
    queueCashCheckout: queueCashCheckoutMock,
    queueSplitCheckout: vi.fn(),
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
  fetchActiveShift: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/useOnlineOrderBadge', () => ({
  ONLINE_ORDERS_POLL_MS: 15_000,
  useOnlineOrderBadge: () => 0,
}));

describe('PosPage offline checkout', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    fetchMeMock.mockReset();
    fetchRecentTransactionsMock.mockReset();
    queueCashCheckoutMock.mockClear();

    fetchRecentTransactionsMock.mockResolvedValue([]);
    fetchMeMock.mockResolvedValue({
      id: 'cashier-1',
      email: 'cashier@barokah.local',
      fullName: 'Kasir A',
      role: 'CASHIER',
      tenantId: 'tenant-1',
      tenantName: 'Barokah',
      outletIds: ['outlet-1'],
    });

  });

  it('queues cash checkout when offline and shows banner', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <PosPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Mode offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Mode offline — 1 item antrean menunggu sinkronisasi/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Semen Portland/i }));
    fireEvent.change(screen.getByPlaceholderText('150.000'), { target: { value: '100000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Checkout Tunai' }));

    await waitFor(() => {
      expect(queueCashCheckoutMock).toHaveBeenCalledWith(
        expect.objectContaining({
          cashReceived: 100000,
          items: [{ productId: 'prod-1', quantity: 1 }],
        }),
      );
    });

    expect(screen.getByText(/Transaksi offline tersimpan/i)).toBeInTheDocument();
    expect(authFetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/checkout-cash'),
      expect.anything(),
    );
  });
});
