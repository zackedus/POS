import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import DashboardDeliveriesPage from './page';

const fetchDeliveriesMock = vi.fn();

vi.mock('@/lib/deliveries-api', () => ({
  fetchDeliveries: (...args: unknown[]) => fetchDeliveriesMock(...args),
  fetchDeliveryDetail: vi.fn(),
  updateDeliveryStatus: vi.fn(),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchShippingLabel: vi.fn(),
}));

vi.mock('@/components/pos/ShippingLabelPrint', () => ({
  ShippingLabelPrint: () => null,
  printShippingLabel: vi.fn(),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [
      { id: 'outlet-1', label: 'Cabang Utama (MAIN)' },
      { id: 'outlet-2', label: 'Cabang Selatan (SOUTH)' },
    ],
    selectedOutletId: 'outlet-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

describe('DashboardDeliveriesPage', () => {
  beforeEach(() => {
    fetchDeliveriesMock.mockReset();
    fetchDeliveriesMock.mockResolvedValue({
      items: [
        {
          id: 'delivery-1',
          deliveryNo: 'DLV-20260609-0001',
          deliveryType: 'STORE_DIRECT',
          deliveryTypeLabel: 'Toko Langsung',
          status: 'MENUNGGU',
          statusLabel: 'Menunggu',
          createdAt: '2026-06-09T10:00:00.000Z',
          scheduledAt: null,
          driverName: null,
          notes: null,
          customer: { id: 'cust-1', name: 'Pak Budi', phone: '081234567890' },
          addressSnippet: 'Jl. Merdeka 10, Jakarta',
          outlet: { id: 'outlet-2', name: 'Cabang Selatan' },
          transaction: { id: 'trx-1', receiptNo: 'TRX-01', total: 70000 },
          onlineOrder: null,
          itemCount: 1,
        },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('loads active deliveries without outlet filter by default for multi-outlet tenants', async () => {
    render(<DashboardDeliveriesPage />);

    await waitFor(() => {
      expect(fetchDeliveriesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          outletId: undefined,
          status: 'MENUNGGU,DISIAPKAN,DIKIRIM',
          deliveryType: undefined,
        }),
      );
    });

    expect(await screen.findByText(/DLV-20260609-0001/i)).toBeInTheDocument();
    expect(screen.getByText('Cabang Selatan')).toBeInTheDocument();
  });
});
