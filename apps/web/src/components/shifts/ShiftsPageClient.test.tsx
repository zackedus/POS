import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftsPageClient } from '@/components/shifts/ShiftsPageClient';

const fetchMeMock = vi.fn();
const fetchActiveShiftMock = vi.fn();
const fetchClosePreviewMock = vi.fn();
const fetchShiftHistoryMock = vi.fn();
const openShiftMock = vi.fn();
const closeShiftMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

vi.mock('@/lib/shifts-api', () => ({
  fetchActiveShift: (...args: unknown[]) => fetchActiveShiftMock(...args),
  fetchClosePreview: (...args: unknown[]) => fetchClosePreviewMock(...args),
  fetchShiftHistory: (...args: unknown[]) => fetchShiftHistoryMock(...args),
  openShift: (...args: unknown[]) => openShiftMock(...args),
  closeShift: (...args: unknown[]) => closeShiftMock(...args),
  forceCloseShift: vi.fn(),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'outlet-1', label: 'Cabang Utama (MAIN)' }],
    selectedOutletId: 'outlet-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe('ShiftsPageClient', () => {
  beforeEach(() => {
    fetchMeMock.mockReset();
    fetchActiveShiftMock.mockReset();
    fetchClosePreviewMock.mockReset();
    fetchShiftHistoryMock.mockReset();
    openShiftMock.mockReset();
    closeShiftMock.mockReset();
    pushMock.mockReset();

    fetchMeMock.mockResolvedValue({
      id: 'cashier-1',
      fullName: 'Kasir Utama',
      role: 'CASHIER',
      tenantId: 'tenant-1',
      tenantName: 'Barokah',
      outletIds: ['outlet-1'],
    });
    fetchActiveShiftMock.mockResolvedValue(null);
    fetchShiftHistoryMock.mockResolvedValue({
      items: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
    });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('shows open shift form when no active shift', async () => {
    render(<ShiftsPageClient />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Buka Shift' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Saldo awal kas (IDR)')).toBeInTheDocument();
  });

  it('shows active shift summary with reconciliation stats', async () => {
    fetchActiveShiftMock.mockResolvedValue({
      id: 'shift-1',
      openingCash: 100000,
      openedAt: '2026-06-06T08:00:00.000Z',
    });
    fetchClosePreviewMock.mockResolvedValue({
      shiftId: 'shift-1',
      openingCash: 100000,
      cashSales: 150000,
      arCashCollections: 25000,
      cashExpenses: 10000,
      expectedCash: 265000,
      transactionCount: 3,
      openedAt: '2026-06-06T08:00:00.000Z',
    });

    render(<ShiftsPageClient />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Shift Aktif' })).toBeInTheDocument();
    });
    expect(screen.getByText('Penjualan tunai')).toBeInTheDocument();
    expect(screen.getByText('Terima piutang (tunai)')).toBeInTheDocument();
    expect(screen.getByText(/265\.000/)).toBeInTheDocument();
  });

  it('opens close panel inline and submits closing cash', async () => {
    fetchActiveShiftMock.mockResolvedValue({
      id: 'shift-1',
      openingCash: 100000,
      openedAt: '2026-06-06T08:00:00.000Z',
    });
    fetchClosePreviewMock.mockResolvedValue({
      shiftId: 'shift-1',
      openingCash: 100000,
      cashSales: 150000,
      arCashCollections: 0,
      cashExpenses: 0,
      expectedCash: 250000,
      transactionCount: 3,
      openedAt: '2026-06-06T08:00:00.000Z',
    });
    closeShiftMock.mockResolvedValue({
      id: 'shift-1',
      openingCash: 100000,
      expectedCash: 250000,
      closingCash: 250000,
      difference: 0,
    });

    render(<ShiftsPageClient action="close" />);
    await waitFor(() => {
      expect(screen.getByLabelText('Saldo akhir kas fisik (IDR)')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Saldo akhir kas fisik (IDR)'), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup Shift' }));

    await waitFor(() => {
      expect(closeShiftMock).toHaveBeenCalledWith('shift-1', 250000);
    });
    expect(screen.getByText('Shift ditutup')).toBeInTheDocument();
  });

  it('submits open shift on happy path', async () => {
    openShiftMock.mockResolvedValue({
      id: 'shift-new',
      openingCash: 300000,
      openedAt: '2026-06-02T09:00:00.000Z',
    });
    fetchActiveShiftMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'shift-new',
        openingCash: 300000,
        openedAt: '2026-06-02T09:00:00.000Z',
      });

    render(<ShiftsPageClient action="open" />);
    await waitFor(() => {
      expect(screen.getByLabelText('Saldo awal kas (IDR)')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Saldo awal kas (IDR)'), { target: { value: '300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buka Shift' }));

    await waitFor(() => {
      expect(openShiftMock).toHaveBeenCalledWith(300000, 'outlet-1');
    });
  });
});
