import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsPage from './page';

const fetchAnalyticsSummaryMock = vi.fn();

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'out-1', label: 'Cabang Utama' }],
    selectedOutletId: 'out-1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAdminTheme', () => ({
  useAdminTheme: () => ({
    tokens: {
      cardBg: '#fff',
      cardBorder: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
    },
  }),
}));

vi.mock('@/lib/analytics-api', () => ({
  fetchAnalyticsSummary: (...args: unknown[]) => fetchAnalyticsSummaryMock(...args),
  downloadAnalyticsMarginCsv: vi.fn(),
  downloadAnalyticsWeeklyCsv: vi.fn(),
}));

const sampleSummary = {
  outletId: 'out-1',
  period: 'day' as const,
  dateFrom: '2026-06-09',
  dateTo: '2026-06-09',
  previousDateFrom: '2026-06-08',
  previousDateTo: '2026-06-08',
  timezone: 'Asia/Jakarta',
  pulse: {
    netSales: { current: 1_500_000, previous: 1_200_000, changePercent: 25, direction: 'up' as const },
    transactionCount: { current: 12, previous: 10, changePercent: 20, direction: 'up' as const },
    averageTicket: { current: 125_000, previous: 120_000, changePercent: 4.2, direction: 'up' as const },
    grossProfit: { current: 450_000, previous: 360_000, changePercent: 25, direction: 'up' as const },
    grossProfitPercent: 30,
  },
  salesTrend: [{ label: '09:00', date: '2026-06-09', revenue: 1_500_000, transactionCount: 12 }],
  topProducts: [
    { productId: 'p1', productName: 'Semen 40kg', quantity: 20, revenue: 800_000 },
  ],
  paymentMethods: [
    { method: 'CASH', amount: 900_000, count: 7, sharePercent: 60 },
    { method: 'QRIS', amount: 600_000, count: 5, sharePercent: 40 },
  ],
  outletPerformance: null,
  financeSnapshot: {
    receivablesOutstanding: 250_000,
    receivablesOverdueCount: 1,
    payablesOutstanding: 100_000,
    payablesOverdueCount: 0,
  },
  marginByCategory: [
    { categoryId: 'cat-1', categoryName: 'Semen', revenue: 800_000, margin: 240_000, marginPercent: 30, quantity: 20 },
  ],
  insights: ['Penjualan bersih naik 25% vs kemarin.', 'Produk terlaris: Semen 40kg (20 unit).'],
};

describe('AnalyticsPage', () => {
  beforeEach(() => {
    fetchAnalyticsSummaryMock.mockReset();
    fetchAnalyticsSummaryMock.mockResolvedValue(sampleSummary);
  });

  it('renders KPI pulse and period pills with default Hari ini', async () => {
    render(<AnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Analitik Penjualan')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Hari ini/i })).toBeInTheDocument();
    expect(screen.getByText('Penjualan bersih')).toBeInTheDocument();
    expect(screen.getByText('Semen 40kg')).toBeInTheDocument();
    expect(screen.getByText(/Penjualan bersih naik 25%/)).toBeInTheDocument();
    expect(fetchAnalyticsSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({ period: 'day', outletId: 'out-1' }),
    );
  });
});
