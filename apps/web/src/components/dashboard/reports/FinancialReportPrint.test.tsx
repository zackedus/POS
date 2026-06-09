import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ProfitLossReport } from '@barokah/shared';
import { FinancialReportPrint } from './FinancialReportPrint';

const profitLossReport: ProfitLossReport = {
  meta: {
    outletId: 'outlet-1',
    period: 'month',
    date: '2026-06-01',
    dateFrom: '2026-06-01',
    dateTo: '2026-06-30',
    isRange: true,
    timezone: 'Asia/Jakarta',
    generatedAt: '2026-06-09T10:00:00.000Z',
  },
  revenue: {
    grossSales: 1_000_000,
    voidRefund: 100_000,
    netSales: 900_000,
    transactionCount: 5,
  },
  cogs: 700_000,
  grossProfit: 200_000,
  grossMarginPercent: 22.2,
  operatingExpenses: 150_000,
  expensesByCategory: [{ category: 'OPERATIONAL', amount: 150_000 }],
  netProfit: 50_000,
  netMarginPercent: 5.6,
  breakdown: {
    sections: [
      {
        title: 'Daftar Transaksi Penjualan',
        rows: [
          {
            label: 'CASH',
            referenceNo: 'TRX-001',
            dateTime: '09/06/2026, 10.30',
            customerName: 'PT Maju',
            status: 'Selesai',
            amount: 500_000,
          },
          {
            label: 'CREDIT',
            referenceNo: 'TRX-002',
            dateTime: '09/06/2026, 11.00',
            customerName: 'Walk-in',
            status: 'Selesai',
            amount: 500_000,
          },
        ],
        subtotal: 1_000_000,
      },
      {
        title: 'Rincian Penjualan per Metode Bayar',
        rows: [
          { label: 'CASH', count: 3, amount: 700_000, percentage: 70 },
          { label: 'CREDIT', count: 2, amount: 300_000, percentage: 30 },
        ],
        subtotal: 1_000_000,
      },
      {
        title: 'Rincian HPP per Kategori Produk',
        rows: [{ label: 'Cat & Finishing', quantity: 2, amount: 600_000, percentage: 85.7 }],
        subtotal: 700_000,
      },
    ],
  },
};

describe('FinancialReportPrint', () => {
  it('renders professional P&L layout with header, KPI grid, and detail tables', () => {
    const html = renderToStaticMarkup(
      <FinancialReportPrint
        reportType="profit-loss"
        meta={profitLossReport.meta}
        profitLoss={profitLossReport}
        outletName="Cabang Pusat"
      />,
    );

    expect(html).toMatch(/LAPORAN LABA RUGI/);
    expect(html).toMatch(/RINGKASAN LABA RUGI/);
    expect(html).toMatch(/financial-report-print__header/);
    expect(html).toMatch(/financial-report-print__kpi-grid/);
    expect(html).toMatch(/financial-report-print__report-title/);
    expect(html).toMatch(/Penjualan bersih/);
    expect(html).toMatch(/RINCIAN — DAFTAR TRANSAKSI PENJUALAN/);
    expect(html).toMatch(/TRX-001/);
    expect(html).toMatch(/PT Maju/);
    expect(html).toMatch(/Selesai/);
    expect(html).toMatch(/Rincian Penjualan per Metode Bayar/);
    expect(html).toMatch(/Tunai/);
    expect(html).toMatch(/Tempo \/ Piutang/);
    expect(html).toMatch(/Rincian HPP per Kategori Produk/);
    expect(html).toMatch(/Cabang Pusat/);
    expect(html).toMatch(/Barokah Core POS/);
    expect(html).toMatch(/financial-report-print__footer-page/);
    expect(html).toMatch(/data-testid="financial-report-print"/);
    expect(html).toMatch(/financial-report-print__table/);
    expect(html).toMatch(/@page/);
  });
});
