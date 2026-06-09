'use client';

import type { PropsWithChildren } from 'react';
import {
  FINANCE_REPORT_PERIOD_LABELS,
  FINANCE_REPORT_TYPE_LABELS,
  RECEIVABLE_AGING_BUCKET_LABELS,
  formatCurrencyIDR,
  type CashFlowFinanceReport,
  type DailySummaryFinanceReport,
  type FinanceReportBreakdownRow,
  type FinanceReportBreakdownSection,
  type FinanceReportMeta,
  type FinanceReportType,
  type PayablesFinanceReport,
  type ProfitLossReport,
  type ReceivablesFinanceReport,
} from '@barokah/shared';
import { PAYMENT_METHOD_LABELS } from '@/lib/reports';

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operasional',
  LOADING_UNLOADING: 'Bongkar Muat',
  SHIPPING: 'Pengiriman',
  OTHER: 'Lainnya',
};

const PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 12mm 15mm 18mm 15mm;
  }

  .financial-report-print {
    --frp-border: #e2e8f0;
    --frp-text: #0f172a;
    --frp-text-muted: #334155;
    --frp-header-bg: #1e293b;
    --frp-zebra: #f8fafc;
    --frp-summary-bg: #f8fafc;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: var(--frp-text);
    font-size: 10.5pt;
    line-height: 1.45;
    max-width: none;
    width: 100%;
    box-sizing: border-box;
  }

  .financial-report-print *,
  .financial-report-print *::before,
  .financial-report-print *::after {
    box-sizing: border-box;
  }

  /* ── Header ── */
  .financial-report-print__header {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 0.75rem;
    align-items: start;
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
    border-bottom: 2px solid var(--frp-text);
  }

  .financial-report-print__logo {
    width: 48px;
    height: 48px;
    border: 1px solid var(--frp-border);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    font-weight: 700;
    color: var(--frp-text-muted);
    background: var(--frp-summary-bg);
    letter-spacing: 0.02em;
  }

  .financial-report-print__store-name {
    margin: 0;
    font-size: 13pt;
    font-weight: 700;
    line-height: 1.2;
  }

  .financial-report-print__outlet {
    margin: 0.15rem 0 0;
    font-size: 10pt;
    color: var(--frp-text-muted);
  }

  .financial-report-print__report-title {
    margin: 0.5rem 0 0;
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    line-height: 1.15;
  }

  .financial-report-print__meta {
    margin: 0.35rem 0 0;
    font-size: 10pt;
    color: var(--frp-text-muted);
  }

  .financial-report-print__meta--small {
    margin-top: 0.15rem;
    font-size: 9pt;
    color: var(--frp-text-muted);
  }

  /* ── KPI grid ── */
  .financial-report-print__kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1rem;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .financial-report-print__kpi {
    border: 1px solid var(--frp-border);
    border-radius: 4px;
    padding: 0.45rem 0.6rem;
    background: var(--frp-summary-bg);
    min-width: 0;
  }

  .financial-report-print__kpi-label {
    font-size: 8.5pt;
    color: var(--frp-text-muted);
    margin-bottom: 0.15rem;
    line-height: 1.3;
  }

  .financial-report-print__kpi-value {
    font-size: 11pt;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    word-break: break-word;
  }

  /* ── Sections ── */
  .financial-report-print__section {
    margin-bottom: 1rem;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .financial-report-print__section--breakable {
    break-inside: auto;
    page-break-inside: auto;
  }

  .financial-report-print__section--major {
    break-before: page;
    page-break-before: always;
    margin-top: 0.5rem;
  }

  .financial-report-print__section--major:first-of-type {
    break-before: auto;
    page-break-before: auto;
  }

  .financial-report-print__section-title {
    margin: 0 0 0.4rem;
    font-size: 13pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid var(--frp-border);
    padding-bottom: 0.25rem;
  }

  .financial-report-print__section-note {
    margin: 0 0 0.35rem;
    font-size: 9pt;
    color: var(--frp-text-muted);
    font-style: italic;
  }

  .financial-report-print__empty {
    margin: 0;
    font-size: 10pt;
    color: var(--frp-text-muted);
    font-style: italic;
  }

  /* ── Tables ── */
  .financial-report-print__table-wrap {
    width: 100%;
    overflow: hidden;
  }

  .financial-report-print__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10pt;
  }

  .financial-report-print__table thead {
    display: table-header-group;
  }

  .financial-report-print__table th {
    background: var(--frp-header-bg);
    color: #fff;
    font-weight: 600;
    font-size: 9pt;
    text-align: left;
    padding: 0.35rem 0.45rem;
    border: 1px solid #334155;
    vertical-align: middle;
  }

  .financial-report-print__table th.financial-report-print__num,
  .financial-report-print__table td.financial-report-print__num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .financial-report-print__table th.financial-report-print__center,
  .financial-report-print__table td.financial-report-print__center {
    text-align: center;
  }

  .financial-report-print__table td {
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--frp-border);
    vertical-align: top;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .financial-report-print__table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .financial-report-print__table tbody tr:nth-child(even) {
    background: var(--frp-zebra);
  }

  .financial-report-print__table .financial-report-print__sub {
    color: var(--frp-text-muted);
    font-size: 8.5pt;
    margin-top: 0.1rem;
  }

  .financial-report-print__truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
    display: block;
  }

  .financial-report-print__nowrap {
    white-space: nowrap;
  }

  .financial-report-print__row--emphasis td {
    font-weight: 700;
  }

  .financial-report-print__row--subtotal {
    background: #e2e8f0 !important;
    font-weight: 700;
  }

  .financial-report-print__row--subtotal td {
    border-color: #cbd5e1;
  }

  .financial-report-print__row--group td {
    font-weight: 600;
    background: #f1f5f9 !important;
    border-color: var(--frp-border);
  }

  .financial-report-print__col-no { width: 28px; }
  .financial-report-print__col-date { width: 11%; }
  .financial-report-print__col-ref { width: 10%; }
  .financial-report-print__col-customer { width: 12%; }
  .financial-report-print__col-status { width: 9%; }
  .financial-report-print__col-due { width: 9%; }
  .financial-report-print__col-qty { width: 6%; }
  .financial-report-print__col-count { width: 7%; }
  .financial-report-print__col-pct { width: 6%; }
  .financial-report-print__col-amount { width: 12%; }
  .financial-report-print__col-label { width: auto; }

  /* ── Footer ── */
  .financial-report-print__footer {
    margin-top: 1.25rem;
    padding-top: 0.4rem;
    border-top: 1px solid var(--frp-border);
    font-size: 9pt;
    color: var(--frp-text-muted);
    text-align: center;
  }

  .financial-report-print__footer-page::after {
    content: ' · Halaman ' counter(page);
  }

  @media print {
    .financial-report-print {
      padding: 0 !important;
      font-size: 10pt !important;
      color: #000 !important;
    }

    .financial-report-print__kpi-grid {
      grid-template-columns: repeat(4, 1fr);
    }

    .financial-report-print__table th,
    .financial-report-print__table td {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .financial-report-print__table tbody tr:nth-child(even) {
      background: var(--frp-zebra) !important;
    }

    .financial-report-print__table th {
      background: var(--frp-header-bg) !important;
      color: #fff !important;
    }

    .financial-report-print__footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      margin: 0;
      padding: 0.3rem 0;
      background: #fff;
    }
  }

  @media screen {
    .financial-report-print {
      max-width: 210mm;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .financial-report-print__kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;

export interface FinancialReportPrintProps {
  reportType: FinanceReportType;
  meta: FinanceReportMeta;
  profitLoss?: ProfitLossReport | null;
  receivables?: ReceivablesFinanceReport | null;
  payables?: PayablesFinanceReport | null;
  cashFlow?: CashFlowFinanceReport | null;
  dailySummary?: DailySummaryFinanceReport | null;
  storeName?: string;
  outletName?: string;
}

function periodLabel(meta: FinanceReportMeta): string {
  if (meta.period === 'custom') {
    return `${meta.dateFrom} — ${meta.dateTo}`;
  }
  const preset = FINANCE_REPORT_PERIOD_LABELS[meta.period as keyof typeof FINANCE_REPORT_PERIOD_LABELS];
  return preset ? `${preset} · ${meta.dateFrom}${meta.isRange ? ` — ${meta.dateTo}` : ''}` : meta.date;
}

function resolveBreakdownLabel(label: string): string {
  return PAYMENT_METHOD_LABELS[label] ?? EXPENSE_CATEGORY_LABELS[label] ?? label;
}

function formatPrintedAt(meta: FinanceReportMeta): string {
  return new Date(meta.generatedAt).toLocaleString('id-ID', {
    timeZone: meta.timezone,
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function reportTitleUpper(reportType: FinanceReportType): string {
  return `LAPORAN ${FINANCE_REPORT_TYPE_LABELS[reportType].toUpperCase()}`;
}

function isTransactionDetailSection(section: FinanceReportBreakdownSection): boolean {
  const title = section.title.toLowerCase();
  return (
    title.includes('daftar transaksi') ||
    title.includes('transaksi') ||
    title.includes('kas masuk — transaksi') ||
    title.includes('kas keluar — transaksi') ||
    title.includes('daftar piutang') ||
    title.includes('daftar utang') ||
    title.includes('pengeluaran')
  );
}

function PrintHeader({
  storeName,
  outletName,
  reportTitle,
  period,
  printedAt,
  timezone,
}: {
  storeName: string;
  outletName?: string;
  reportTitle: string;
  period: string;
  printedAt: string;
  timezone: string;
}) {
  return (
    <header className="financial-report-print__header">
      <div className="financial-report-print__logo" aria-hidden="true">
        LOGO
      </div>
      <div>
        <p className="financial-report-print__store-name">{storeName}</p>
        <p className="financial-report-print__outlet">{outletName ?? 'Seluruh Cabang'}</p>
        <h1 className="financial-report-print__report-title">{reportTitle}</h1>
        <p className="financial-report-print__meta">Periode: {period}</p>
        <p className="financial-report-print__meta financial-report-print__meta--small">
          Dicetak: {printedAt} WIB · Zona waktu {timezone}
        </p>
      </div>
    </header>
  );
}

function PrintKpiGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="financial-report-print__kpi-grid" data-testid="financial-report-print-kpi">
      {items.map((item) => (
        <div key={item.label} className="financial-report-print__kpi">
          <div className="financial-report-print__kpi-label">{item.label}</div>
          <div className="financial-report-print__kpi-value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function PrintSection({
  title,
  children,
  major = false,
  breakable = false,
}: PropsWithChildren<{
  title: string;
  major?: boolean;
  breakable?: boolean;
}>) {
  const classes = [
    'financial-report-print__section',
    major ? 'financial-report-print__section--major' : '',
    breakable ? 'financial-report-print__section--breakable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <h2 className="financial-report-print__section-title">{title}</h2>
      <div>{children as never}</div>
    </section>
  );
}

function PrintSummaryRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <tr className={emphasize ? 'financial-report-print__row--emphasis' : undefined}>
      <td className="financial-report-print__col-label">{label}</td>
      <td className="financial-report-print__num financial-report-print__col-amount">{value}</td>
    </tr>
  );
}

function PrintDetailTable({
  section,
  startIndex = 0,
  showDateTime = false,
  showReference = false,
  showCustomer = false,
  showStatus = false,
  showDueDate = false,
  showOriginalAmount = false,
  showRemainingAmount = false,
  showDebitCredit = false,
  showQuantity = false,
  showCount = false,
  showPercentage = false,
  majorSection = false,
}: {
  section: FinanceReportBreakdownSection;
  startIndex?: number;
  showDateTime?: boolean;
  showReference?: boolean;
  showCustomer?: boolean;
  showStatus?: boolean;
  showDueDate?: boolean;
  showOriginalAmount?: boolean;
  showRemainingAmount?: boolean;
  showDebitCredit?: boolean;
  showQuantity?: boolean;
  showCount?: boolean;
  showPercentage?: boolean;
  majorSection?: boolean;
}) {
  const rows = section.rows;
  const hasDateTime = showDateTime || rows.some((r) => r.dateTime);
  const hasReference = showReference || rows.some((r) => r.referenceNo);
  const hasCustomer = showCustomer || rows.some((r) => r.customerName);
  const hasStatus = showStatus || rows.some((r) => r.status);
  const hasDueDate = showDueDate || rows.some((r) => r.dueDate);
  const hasOriginal = showOriginalAmount || rows.some((r) => r.originalAmount != null);
  const hasRemaining = showRemainingAmount || rows.some((r) => r.remainingAmount != null);
  const hasDebitCredit = showDebitCredit || rows.some((r) => r.debit != null || r.credit != null);
  const hasQty = showQuantity || rows.some((r) => r.quantity != null);
  const hasCnt = showCount || rows.some((r) => r.count != null);
  const hasPct = showPercentage || rows.some((r) => r.percentage != null);

  const sectionTitle = isTransactionDetailSection(section) ? `RINCIAN — ${section.title.toUpperCase()}` : section.title;

  if (rows.length === 0) {
    return (
      <PrintSection title={sectionTitle} major={majorSection}>
        <p className="financial-report-print__empty">
          {section.emptyMessage ?? 'Tidak ada transaksi pada periode ini'}
        </p>
      </PrintSection>
    );
  }

  const labelColSpan =
    1 +
    (hasDateTime ? 1 : 0) +
    (hasReference ? 1 : 0) +
    1 +
    (hasCustomer ? 1 : 0) +
    (hasStatus ? 1 : 0) +
    (hasDueDate ? 1 : 0) +
    (hasOriginal ? 1 : 0) +
    (hasRemaining ? 1 : 0) +
    (hasQty ? 1 : 0) +
    (hasCnt ? 1 : 0) +
    (hasPct ? 1 : 0);

  return (
    <PrintSection title={sectionTitle} major={majorSection} breakable>
      {section.truncatedNote ? <p className="financial-report-print__section-note">{section.truncatedNote}</p> : null}
      <div className="financial-report-print__table-wrap">
        <table className="financial-report-print__table">
          <thead>
            <tr>
              <th className="financial-report-print__center financial-report-print__col-no">No</th>
              {hasDateTime ? <th className="financial-report-print__col-date">Tanggal</th> : null}
              {hasReference ? <th className="financial-report-print__col-ref">Referensi</th> : null}
              <th className="financial-report-print__col-label">Keterangan</th>
              {hasCustomer ? <th className="financial-report-print__col-customer">Pelanggan</th> : null}
              {hasQty ? <th className="financial-report-print__num financial-report-print__col-qty">Qty</th> : null}
              {hasCnt ? <th className="financial-report-print__num financial-report-print__col-count">Jumlah</th> : null}
              {hasDueDate ? <th className="financial-report-print__col-due">Jatuh Tempo</th> : null}
              {hasStatus ? <th className="financial-report-print__col-status">Status</th> : null}
              {hasOriginal ? <th className="financial-report-print__num financial-report-print__col-amount">Jumlah</th> : null}
              {hasRemaining ? <th className="financial-report-print__num financial-report-print__col-amount">Sisa</th> : null}
              {hasPct ? <th className="financial-report-print__num financial-report-print__col-pct">%</th> : null}
              {hasDebitCredit ? (
                <>
                  <th className="financial-report-print__num financial-report-print__col-amount">Debit</th>
                  <th className="financial-report-print__num financial-report-print__col-amount">Kredit</th>
                </>
              ) : (
                <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: FinanceReportBreakdownRow, index) => (
              <tr key={`${row.referenceNo ?? row.label}-${index}`}>
                <td className="financial-report-print__center financial-report-print__col-no">{startIndex + index + 1}</td>
                {hasDateTime ? (
                  <td className="financial-report-print__nowrap financial-report-print__col-date">{row.dateTime ?? '—'}</td>
                ) : null}
                {hasReference ? (
                  <td className="financial-report-print__col-ref">
                    <span className="financial-report-print__truncate">{row.referenceNo ?? '—'}</span>
                  </td>
                ) : null}
                <td className="financial-report-print__col-label">
                  <span className="financial-report-print__truncate">{resolveBreakdownLabel(row.label)}</span>
                  {row.subLabel ? <div className="financial-report-print__sub">{row.subLabel}</div> : null}
                </td>
                {hasCustomer ? (
                  <td className="financial-report-print__col-customer">
                    <span className="financial-report-print__truncate">{row.customerName ?? '—'}</span>
                  </td>
                ) : null}
                {hasQty ? (
                  <td className="financial-report-print__num financial-report-print__col-qty">{row.quantity ?? '—'}</td>
                ) : null}
                {hasCnt ? (
                  <td className="financial-report-print__num financial-report-print__col-count">{row.count ?? '—'}</td>
                ) : null}
                {hasDueDate ? (
                  <td className="financial-report-print__nowrap financial-report-print__col-due">{row.dueDate ?? '—'}</td>
                ) : null}
                {hasStatus ? (
                  <td className="financial-report-print__col-status">
                    <span className="financial-report-print__truncate">{row.status ?? '—'}</span>
                  </td>
                ) : null}
                {hasOriginal ? (
                  <td className="financial-report-print__num financial-report-print__col-amount">
                    {row.originalAmount != null ? formatCurrencyIDR(row.originalAmount) : '—'}
                  </td>
                ) : null}
                {hasRemaining ? (
                  <td className="financial-report-print__num financial-report-print__col-amount">
                    {row.remainingAmount != null ? formatCurrencyIDR(row.remainingAmount) : formatCurrencyIDR(row.amount)}
                  </td>
                ) : null}
                {hasPct ? (
                  <td className="financial-report-print__num financial-report-print__col-pct">
                    {row.percentage != null ? `${row.percentage}%` : '—'}
                  </td>
                ) : null}
                {hasDebitCredit ? (
                  <>
                    <td className="financial-report-print__num financial-report-print__col-amount">
                      {row.debit != null ? formatCurrencyIDR(row.debit) : '—'}
                    </td>
                    <td className="financial-report-print__num financial-report-print__col-amount">
                      {row.credit != null ? formatCurrencyIDR(row.credit) : '—'}
                    </td>
                  </>
                ) : (
                  <td className="financial-report-print__num financial-report-print__col-amount">
                    {formatCurrencyIDR(row.amount)}
                  </td>
                )}
              </tr>
            ))}
            {section.subtotal != null ? (
              <tr className="financial-report-print__row--subtotal">
                <td colSpan={labelColSpan} className="financial-report-print__num">
                  Subtotal
                </td>
                {hasDebitCredit ? (
                  <td colSpan={2} className="financial-report-print__num financial-report-print__col-amount">
                    {formatCurrencyIDR(section.subtotal)}
                  </td>
                ) : (
                  <td className="financial-report-print__num financial-report-print__col-amount">
                    {formatCurrencyIDR(section.subtotal)}
                  </td>
                )}
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PrintSection>
  );
}

function renderBreakdownSections(
  sections: FinanceReportBreakdownSection[],
  options: {
    showDateTime?: boolean;
    showReference?: boolean;
    showCustomer?: boolean;
    showStatus?: boolean;
    showDueDate?: boolean;
    showOriginalAmount?: boolean;
    showRemainingAmount?: boolean;
    showDebitCredit?: boolean;
    showQuantity?: boolean;
    showCount?: boolean;
    showPercentage?: boolean;
  } = {},
) {
  return sections.map((section, index) => {
    const isDetail = isTransactionDetailSection(section);
    return (
      <PrintDetailTable
        key={section.title}
        section={section}
        majorSection={isDetail && index > 0}
        showDateTime={options.showDateTime ?? isDetail}
        showReference={options.showReference ?? isDetail}
        showCustomer={options.showCustomer ?? isDetail}
        showStatus={options.showStatus}
        showDueDate={options.showDueDate}
        showOriginalAmount={options.showOriginalAmount}
        showRemainingAmount={options.showRemainingAmount}
        showDebitCredit={options.showDebitCredit}
        showQuantity={options.showQuantity}
        showCount={options.showCount}
        showPercentage={options.showPercentage}
      />
    );
  });
}

/** Printable financial report layout — use with window.print() and @media print CSS. */
export function FinancialReportPrint({
  reportType,
  meta,
  profitLoss,
  receivables,
  payables,
  cashFlow,
  dailySummary,
  storeName = 'Barokah Core POS',
  outletName,
}: FinancialReportPrintProps) {
  const title = FINANCE_REPORT_TYPE_LABELS[reportType];
  const reportTitle = reportTitleUpper(reportType);
  const printedAt = formatPrintedAt(meta);
  const period = periodLabel(meta);

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <article data-testid="financial-report-print" className="financial-report-print">
        <PrintHeader
          storeName={storeName}
          outletName={outletName}
          reportTitle={reportTitle}
          period={period}
          printedAt={printedAt}
          timezone={meta.timezone}
        />

        {reportType === 'profit-loss' && profitLoss ? (
          <>
            <PrintKpiGrid
              items={[
                { label: 'Penjualan bersih', value: formatCurrencyIDR(profitLoss.revenue.netSales) },
                { label: 'Laba kotor', value: formatCurrencyIDR(profitLoss.grossProfit) },
                { label: 'Beban operasional', value: formatCurrencyIDR(profitLoss.operatingExpenses) },
                { label: 'Laba bersih', value: formatCurrencyIDR(profitLoss.netProfit) },
              ]}
            />
            <PrintSection title="RINGKASAN LABA RUGI">
              <div className="financial-report-print__table-wrap">
                <table className="financial-report-print__table">
                  <thead>
                    <tr>
                      <th className="financial-report-print__col-label">Pos</th>
                      <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <PrintSummaryRow label="Penjualan kotor" value={formatCurrencyIDR(profitLoss.revenue.grossSales)} />
                    <PrintSummaryRow
                      label="Void / refund"
                      value={`(${formatCurrencyIDR(profitLoss.revenue.voidRefund)})`}
                    />
                    <PrintSummaryRow
                      label="Penjualan bersih"
                      value={formatCurrencyIDR(profitLoss.revenue.netSales)}
                      emphasize
                    />
                    <PrintSummaryRow label="HPP (COGS)" value={`(${formatCurrencyIDR(profitLoss.cogs)})`} />
                    <PrintSummaryRow label="Laba kotor" value={formatCurrencyIDR(profitLoss.grossProfit)} emphasize />
                    <PrintSummaryRow
                      label="Margin kotor"
                      value={`${profitLoss.grossMarginPercent.toLocaleString('id-ID')}%`}
                    />
                    <PrintSummaryRow
                      label="Beban operasional"
                      value={`(${formatCurrencyIDR(profitLoss.operatingExpenses)})`}
                    />
                    {profitLoss.expensesByCategory.map((row) => (
                      <PrintSummaryRow
                        key={row.category}
                        label={`  · ${EXPENSE_CATEGORY_LABELS[row.category] ?? row.category}`}
                        value={formatCurrencyIDR(row.amount)}
                      />
                    ))}
                    <PrintSummaryRow label="Laba bersih" value={formatCurrencyIDR(profitLoss.netProfit)} emphasize />
                    <PrintSummaryRow
                      label="Margin bersih"
                      value={`${profitLoss.netMarginPercent.toLocaleString('id-ID')}%`}
                    />
                  </tbody>
                </table>
              </div>
            </PrintSection>
            {renderBreakdownSections(profitLoss.breakdown.sections, {
              showStatus: true,
              showCount: true,
              showQuantity: true,
              showPercentage: true,
            })}
          </>
        ) : null}

        {reportType === 'receivables' && receivables ? (
          <>
            <PrintKpiGrid
              items={[
                { label: 'Outstanding', value: formatCurrencyIDR(receivables.summary.outstanding) },
                { label: 'Baru periode', value: formatCurrencyIDR(receivables.summary.newInPeriod) },
                { label: 'Pelunasan', value: formatCurrencyIDR(receivables.summary.collectionsInPeriod) },
                {
                  label: 'Jatuh tempo',
                  value: `${receivables.summary.overdueCount} faktur · ${formatCurrencyIDR(receivables.summary.overdueAmount)}`,
                },
              ]}
            />
            <PrintSection title="AGING PIUTANG">
              <div className="financial-report-print__table-wrap">
                <table className="financial-report-print__table">
                  <thead>
                    <tr>
                      <th className="financial-report-print__col-label">Bucket</th>
                      <th className="financial-report-print__num financial-report-print__col-count">Faktur</th>
                      <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(receivables.aging).map(([bucket, row]) => (
                      <tr key={bucket}>
                        <td>
                          {RECEIVABLE_AGING_BUCKET_LABELS[bucket as keyof typeof RECEIVABLE_AGING_BUCKET_LABELS]}
                        </td>
                        <td className="financial-report-print__num">{row.count}</td>
                        <td className="financial-report-print__num">{formatCurrencyIDR(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PrintSection>
            {renderBreakdownSections(receivables.breakdown.sections, {
              showReference: true,
              showDueDate: true,
              showStatus: true,
              showOriginalAmount: true,
              showRemainingAmount: true,
            })}
          </>
        ) : null}

        {reportType === 'payables' && payables ? (
          <>
            <PrintKpiGrid
              items={[
                { label: 'Outstanding utang', value: formatCurrencyIDR(payables.summary.outstanding) },
                { label: 'Utang baru', value: formatCurrencyIDR(payables.summary.newInPeriod) },
                { label: 'Pembayaran', value: formatCurrencyIDR(payables.summary.paymentsInPeriod) },
                {
                  label: 'Jatuh tempo',
                  value: `${payables.summary.overdueCount} faktur · ${formatCurrencyIDR(payables.summary.overdueAmount)}`,
                },
              ]}
            />
            {renderBreakdownSections(payables.breakdown.sections, {
              showReference: true,
              showDueDate: true,
              showStatus: true,
              showOriginalAmount: true,
              showRemainingAmount: true,
            })}
          </>
        ) : null}

        {reportType === 'cash-flow' && cashFlow ? (
          <>
            <PrintKpiGrid
              items={[
                { label: 'Kas masuk', value: formatCurrencyIDR(cashFlow.cashIn.total) },
                { label: 'Kas keluar', value: formatCurrencyIDR(cashFlow.cashOut.total) },
                { label: 'Arus kas bersih', value: formatCurrencyIDR(cashFlow.netCashFlow) },
              ]}
            />
            <PrintSection title="RINGKASAN ARUS KAS">
              <div className="financial-report-print__table-wrap">
                <table className="financial-report-print__table">
                  <thead>
                    <tr>
                      <th className="financial-report-print__col-label">Pos</th>
                      <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="financial-report-print__row--group">
                      <td colSpan={2}>Kas Masuk</td>
                    </tr>
                    <PrintSummaryRow label="Penjualan tunai" value={formatCurrencyIDR(cashFlow.cashIn.cashSales)} />
                    <PrintSummaryRow
                      label="Pelunasan piutang"
                      value={formatCurrencyIDR(cashFlow.cashIn.receivableCollections)}
                    />
                    <PrintSummaryRow label="Total masuk" value={formatCurrencyIDR(cashFlow.cashIn.total)} emphasize />
                    <tr className="financial-report-print__row--group">
                      <td colSpan={2}>Kas Keluar</td>
                    </tr>
                    <PrintSummaryRow
                      label="Bayar utang supplier"
                      value={formatCurrencyIDR(cashFlow.cashOut.payablePayments)}
                    />
                    <PrintSummaryRow
                      label="Pengeluaran operasional"
                      value={formatCurrencyIDR(cashFlow.cashOut.operatingExpenses)}
                    />
                    <PrintSummaryRow label="Total keluar" value={formatCurrencyIDR(cashFlow.cashOut.total)} emphasize />
                    <PrintSummaryRow label="Arus kas bersih" value={formatCurrencyIDR(cashFlow.netCashFlow)} emphasize />
                  </tbody>
                </table>
              </div>
            </PrintSection>
            {renderBreakdownSections(cashFlow.breakdown.sections, {
              showDebitCredit: true,
              showCount: true,
              showPercentage: true,
            })}
          </>
        ) : null}

        {reportType === 'daily-summary' && dailySummary ? (
          <>
            <PrintKpiGrid
              items={[
                { label: 'Omzet bersih', value: formatCurrencyIDR(dailySummary.omzet.net) },
                { label: 'Transaksi', value: String(dailySummary.omzet.transactionCount) },
                {
                  label: 'Piutang baru',
                  value: `${dailySummary.newReceivables.count} · ${formatCurrencyIDR(dailySummary.newReceivables.amount)}`,
                },
                {
                  label: 'Utang baru',
                  value: `${dailySummary.newPayables.count} · ${formatCurrencyIDR(dailySummary.newPayables.amount)}`,
                },
              ]}
            />
            <PrintSection title="RINGKASAN HARIAN">
              <div className="financial-report-print__table-wrap">
                <table className="financial-report-print__table">
                  <thead>
                    <tr>
                      <th className="financial-report-print__col-label">Pos</th>
                      <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <PrintSummaryRow label="Omzet kotor" value={formatCurrencyIDR(dailySummary.omzet.gross)} />
                    <PrintSummaryRow
                      label="Void / refund"
                      value={`(${formatCurrencyIDR(dailySummary.omzet.voidRefundTotal)})`}
                    />
                    <PrintSummaryRow label="Omzet bersih" value={formatCurrencyIDR(dailySummary.omzet.net)} emphasize />
                    <PrintSummaryRow label="Jumlah transaksi" value={String(dailySummary.omzet.transactionCount)} />
                  </tbody>
                </table>
              </div>
              <h3
                className="financial-report-print__section-title"
                style={{ marginTop: '0.75rem', fontSize: '11pt' }}
              >
                MIX PEMBAYARAN
              </h3>
              <div className="financial-report-print__table-wrap">
                <table className="financial-report-print__table">
                  <thead>
                    <tr>
                      <th className="financial-report-print__col-label">Metode</th>
                      <th className="financial-report-print__num financial-report-print__col-amount">Nominal</th>
                      <th className="financial-report-print__num financial-report-print__col-pct">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummary.paymentMix.map((row) => (
                      <tr key={row.method}>
                        <td>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
                        <td className="financial-report-print__num">{formatCurrencyIDR(row.amount)}</td>
                        <td className="financial-report-print__num">{row.sharePercent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PrintSection>
            {renderBreakdownSections(dailySummary.breakdown.sections, {
              showStatus: true,
              showCount: true,
              showQuantity: true,
              showPercentage: true,
            })}
          </>
        ) : null}

        <footer
          className="financial-report-print__footer financial-report-print__footer-page"
          data-testid="financial-report-print-footer"
        >
          Barokah Core POS · Laporan {title} · {period}
        </footer>
      </article>
    </>
  );
}
