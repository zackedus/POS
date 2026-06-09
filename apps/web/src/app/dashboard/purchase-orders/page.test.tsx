import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchaseOrdersPage from './page';

const fetchSuppliersMock = vi.fn();
const fetchPurchaseOrdersMock = vi.fn();

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'out-1', label: 'Cabang Utama' }],
    selectedOutletId: 'out-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/lib/suppliers-api', () => ({
  fetchSuppliers: (...args: unknown[]) => fetchSuppliersMock(...args),
  fetchPurchaseOrders: (...args: unknown[]) => fetchPurchaseOrdersMock(...args),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  PO_STATUS_LABELS: {
    DRAFT: 'Draft',
    ORDERED: 'Dikirim ke Distributor',
    PARTIALLY_RECEIVED: 'Sebagian Diterima',
    RECEIVED: 'Diterima Lengkap',
    CANCELLED: 'Dibatalkan',
  },
  poStatusVariant: () => 'neutral',
  formatPoDate: (value: string | null) => value ?? '—',
}));

describe('PurchaseOrdersPage', () => {
  beforeEach(() => {
    fetchSuppliersMock.mockReset();
    fetchPurchaseOrdersMock.mockReset();
    fetchSuppliersMock.mockResolvedValue([
      { id: 'sup-1', name: 'PT Semen', phone: '081', email: null, address: null, isActive: true },
    ]);
    fetchPurchaseOrdersMock.mockResolvedValue({
      items: [
        {
          id: 'po-1',
          orderNo: 'PO-20260602-0001',
          status: 'ORDERED',
          supplierId: 'sup-1',
          supplierName: 'PT Semen',
          notes: null,
          orderedAt: '2026-06-02T08:00:00.000Z',
          expectedDeliveryAt: null,
          receivedAt: null,
          createdAt: '2026-06-02T08:00:00.000Z',
          itemCount: 2,
          subtotal: 1500000,
        },
      ],
      meta: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });
  });

  it('renders PO list and create order action', async () => {
    render(<PurchaseOrdersPage />);

    expect(await screen.findByText('PO-20260602-0001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat Order Distributor' })).toBeInTheDocument();
  });

  it('loads suppliers and purchase orders on mount', async () => {
    render(<PurchaseOrdersPage />);
    await waitFor(() => {
      expect(fetchSuppliersMock).toHaveBeenCalled();
      expect(fetchPurchaseOrdersMock).toHaveBeenCalledWith(
        expect.objectContaining({ outletId: 'out-1', page: 1, limit: 25 }),
      );
    });
  });
});
