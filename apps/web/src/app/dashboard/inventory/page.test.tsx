import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryPage from './page';

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'outlet-1', label: 'Cabang Utama (MAIN)' }],
    selectedOutletId: 'outlet-1',
    needsOutletPick: false,
  }),
}));

const fetchInventoryMock = vi.fn();

vi.mock('@/lib/inventory-api', () => ({
  fetchInventory: (...args: unknown[]) => fetchInventoryMock(...args),
  fetchStockMovements: vi.fn().mockResolvedValue({ outletId: 'outlet-1', movements: [] }),
  adjustStock: vi.fn(),
  opnameStock: vi.fn(),
  transferStock: vi.fn(),
  updateMinStock: vi.fn(),
  STOCK_ADJUST_REASON_OPTIONS: [
    { value: 'GIFT', label: 'Hadiah / bonus masuk', direction: 'IN' },
    { value: 'OTHER', label: 'Lainnya', direction: 'BOTH' },
  ],
}));

describe('InventoryPage', () => {
  beforeEach(() => {
    fetchInventoryMock.mockReset();
    fetchInventoryMock.mockResolvedValue({
      outletId: 'outlet-1',
      lowStockCount: 1,
      totalCount: 2,
      items: [
        {
          id: 'inv-1',
          outletId: 'outlet-1',
          productId: 'prod-1',
          sku: 'SMN-001',
          productName: 'Semen Portland',
          displayName: 'Semen Portland',
          variantLabel: null,
          parentProductName: null,
          hasVariants: false,
          unitSymbol: 'sak',
          unitName: 'Sak',
          quantity: 3,
          minStock: 5,
          isLowStock: true,
          isActive: true,
        },
      ],
    });
  });

  it('renders inventory table with low stock badge', async () => {
    render(<InventoryPage />);
    expect(await screen.findByText('Manajemen Stok')).toBeInTheDocument();
    expect(screen.getByText('Semen Portland')).toBeInTheDocument();
    expect(screen.getByText('Stok rendah')).toBeInTheDocument();
    expect(screen.getByText('SMN-001')).toBeInTheDocument();
  });

  it('renders transfer antar cabang tab', async () => {
    render(<InventoryPage />);
    expect(await screen.findByText('Manajemen Stok')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transfer Cabang' })).toBeInTheDocument();
  });
});
