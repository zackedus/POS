import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FinanceReportBreakdownTable } from './FinanceReportBreakdownTable';

describe('FinanceReportBreakdownTable', () => {
  it('renders breakdown rows with subtotal for P&L section', () => {
    const html = renderToStaticMarkup(
      <FinanceReportBreakdownTable
        section={{
          title: 'Rincian Penjualan per Metode Bayar',
          rows: [
            { label: 'CASH', count: 3, amount: 700_000, percentage: 70 },
            { label: 'TRANSFER', count: 1, amount: 300_000, percentage: 30 },
          ],
          subtotal: 1_000_000,
        }}
        showCount
        showPercentage
      />,
    );

    expect(html).toMatch(/Rincian Penjualan per Metode Bayar/);
    expect(html).toMatch(/Tunai/);
    expect(html).toMatch(/Transfer/);
    expect(html).toMatch(/Subtotal/);
    expect(html).toMatch(/data-testid="breakdown-section-Rincian Penjualan per Metode Bayar"/);
  });

  it('shows empty state when no rows', () => {
    const html = renderToStaticMarkup(
      <FinanceReportBreakdownTable
        section={{
          title: 'Rincian Beban Operasional',
          rows: [],
          emptyMessage: 'Tidak ada data pada periode ini',
        }}
      />,
    );

    expect(html).toMatch(/Tidak ada data pada periode ini/);
  });
});
