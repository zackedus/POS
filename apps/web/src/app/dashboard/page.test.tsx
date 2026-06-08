import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardHomePage from './page';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const fetchDashboardMock = vi.fn();
const exportDailyReportMock = vi.fn();
const fetchStockReportMock = vi.fn();
const fetchFulfillmentQueueMock = vi.fn();
const fetchFinanceSummaryMock = vi.fn();

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [],
    selectedOutletId: 'out-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: (...args: unknown[]) => fetchFulfillmentQueueMock(...args),
}));

vi.mock('@/lib/finance-api', () => ({
  fetchFinanceSummary: (...args: unknown[]) => fetchFinanceSummaryMock(...args),
  sendOverdueReminders: vi.fn().mockResolvedValue({ sent: 0 }),
}));

vi.mock('@/lib/reports', async () => {
  const actual = await vi.importActual<typeof import('@/lib/reports')>('@/lib/reports');
  return {
    ...actual,
    fetchDashboard: (...args: unknown[]) => fetchDashboardMock(...args),
    exportDailyReport: (...args: unknown[]) => exportDailyReportMock(...args),
    fetchStockReport: (...args: unknown[]) => fetchStockReportMock(...args),
  };
});

const sampleDashboard = {
  outletId: 'out-1',
  date: '2026-06-02',
  timezone: 'Asia/Jakarta',
  pulse: {
    transactionCount: 12,
    grossOmzet: 3_500_000,
    netOmzet: 3_500_000,
    voidRefundCount: 0,
    voidRefundTotal: 0,
    paymentMix: [
      { method: 'CASH', amount: 2_000_000, count: 7, sharePercent: 57.1 },
      { method: 'QRIS', amount: 1_500_000, count: 5, sharePercent: 42.9 },
    ],
  },
  operations: {
    activeShifts: 1,
    shiftsClosedToday: 0,
  },
  shiftSummaries: [
    {
      shiftId: 'shift-1',
      cashierId: 'cashier-1',
      cashierName: 'Kasir A',
      openingCash: 100_000,
      closingCash: null,
      expectedCash: null,
      difference: null,
      openedAt: '2026-06-02T01:00:00.000Z',
      closedAt: null,
      transactionCount: 12,
      grossOmzet: 3_500_000,
      isOpen: true,
    },
  ],
};

describe('DashboardHomePage', () => {
  beforeEach(() => {
    fetchDashboardMock.mockReset();
    exportDailyReportMock.mockReset();
    fetchStockReportMock.mockReset();
    fetchFulfillmentQueueMock.mockReset();
    fetchFinanceSummaryMock.mockReset();
    fetchFinanceSummaryMock.mockResolvedValue({
      receivablesOutstanding: 0,
      receivablesOverdue: 0,
      receivablesOverdueAmount: 0,
      payablesOutstanding: 0,
      payablesOverdue: 0,
      payablesOverdueAmount: 0,
      depositsOutstanding: 0,
      cashToday: 0,
      netPosition: 0,
      date: todayIsoDate(),
      outletId: 'out-1',
    });
    fetchStockReportMock.mockResolvedValue(null);
    exportDailyReportMock.mockResolvedValue({
      status: 'unavailable',
      message: 'Export belum tersedia.',
    });
    fetchFulfillmentQueueMock.mockResolvedValue([]);
  });

  it('renders sales widgets, shift status, and payment mix from dashboard API', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: sampleDashboard,
    });

    render(<DashboardHomePage />);

    expect(await screen.findByLabelText('Omzet harian')).toHaveTextContent(/3\.500\.000/);
    expect(screen.getByLabelText('Jumlah transaksi')).toHaveTextContent('12');
    expect(screen.getByLabelText('Shift aktif')).toHaveTextContent('1');
    expect(screen.getByText('Kasir A')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();
    expect(screen.getByText(/Tunai/)).toBeInTheDocument();
    expect(screen.getByText(/QRIS/)).toBeInTheDocument();
    expect(screen.queryByText(/API dashboard belum tersedia/)).not.toBeInTheDocument();
  });

  it('renders quick links for admin navigation', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: sampleDashboard,
    });

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');

    expect(screen.getByRole('link', { name: /Kasir/ })).toHaveAttribute('href', '/pos');
    expect(screen.getByRole('link', { name: /Produk/ })).toHaveAttribute('href', '/master/products');
    expect(screen.getByRole('link', { name: /Order Online/ })).toHaveAttribute('href', '/pos/online-orders');
  });

  it('shows online order badge when fulfillment queue has items', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: sampleDashboard,
    });
    fetchFulfillmentQueueMock.mockResolvedValue([
      { id: 'o1', orderNo: 'WEB-001', status: 'PAID' },
      { id: 'o2', orderNo: 'WEB-002', status: 'CONFIRMED' },
    ]);

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    expect(fetchFulfillmentQueueMock).toHaveBeenCalledWith('out-1');
  });

  it('shows mock fallback banner when API is unavailable', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'mock',
      dashboard: {
        ...sampleDashboard,
        pulse: {
          ...sampleDashboard.pulse,
          transactionCount: 0,
          grossOmzet: 0,
          paymentMix: [],
        },
        operations: { activeShifts: 0, shiftsClosedToday: 0 },
        shiftSummaries: [],
      },
    });

    render(<DashboardHomePage />);

    expect(await screen.findByText(/API dashboard belum tersedia/)).toBeInTheDocument();
    expect(screen.getByLabelText('Omzet harian')).toHaveTextContent(/Rp\s?0/);
  });

  it('reloads dashboard when Muat ulang is clicked', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: {
        ...sampleDashboard,
        pulse: { ...sampleDashboard.pulse, transactionCount: 1, grossOmzet: 100_000 },
      },
    });

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');
    expect(screen.getByLabelText('Omzet harian')).toHaveTextContent(/100\.000/);

    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: {
        ...sampleDashboard,
        pulse: { ...sampleDashboard.pulse, transactionCount: 2, grossOmzet: 200_000 },
      },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Muat ulang' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Omzet harian')).toHaveTextContent(/200\.000/);
    });
    expect(fetchDashboardMock).toHaveBeenCalledTimes(2);
  });

  it('passes outletId to fetchDashboard', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: sampleDashboard,
    });

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');

    expect(fetchDashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({ outletId: 'out-1' }),
    );
  });

  it('shows export unavailable message when API export is not ready', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: {
        ...sampleDashboard,
        pulse: { ...sampleDashboard.pulse, transactionCount: 1, grossOmzet: 50_000 },
      },
    });

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');

    fireEvent.click(screen.getByRole('button', { name: 'Ekspor CSV' }));

    expect(await screen.findByText(/Export belum tersedia/)).toBeInTheDocument();
    expect(exportDailyReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ date: todayIsoDate(), outletId: 'out-1', format: 'csv' }),
    );
  });

  it('shows PDF export button and calls export with pdf format', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: sampleDashboard,
    });
    exportDailyReportMock.mockResolvedValue({
      status: 'downloaded',
      filename: 'laporan-harian.pdf',
    });

    render(<DashboardHomePage />);
    await screen.findByLabelText('Omzet harian');

    fireEvent.click(screen.getByRole('button', { name: 'Ekspor PDF' }));

    await waitFor(() => {
      expect(exportDailyReportMock).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'pdf', outletId: 'out-1' }),
      );
    });
  });

  it('supports report range mode filter', async () => {
    fetchDashboardMock.mockResolvedValue({
      source: 'api',
      dashboard: {
        ...sampleDashboard,
        isRange: true,
        dateFrom: '2026-06-01',
        dateTo: '2026-06-03',
        date: '2026-06-01 s/d 2026-06-03',
      },
    });

    render(<DashboardHomePage />);
    fireEvent.change(screen.getByLabelText('Mode laporan'), { target: { value: 'range' } });

    await waitFor(() => {
      expect(fetchDashboardMock).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: todayIsoDate(), dateTo: todayIsoDate(), outletId: 'out-1' }),
      );
    });

    expect(await screen.findByText(/Penjualan Rentang/)).toBeInTheDocument();
  });
});
