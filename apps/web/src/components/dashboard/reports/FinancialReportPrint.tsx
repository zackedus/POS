'use client';

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
    margin: 15mm;
  }
  @media print {
    .financial-report-print {
      font-size: 11pt !important;
      max-width: none !important;
      padding: 0 !important;
      color: #000 !important;
    }
    .financial-report-print__section {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .financial-report-print__section--major {
      page-break-before: always;
      break-before: page;
    }
    .financial-report-print__section--major:first-of-type {
      page-break-before: auto;
      break-before: auto;
    }
    .financial-report-print__table {
      font-size: 10pt !important;
    }
    .financial-report-print__table th,
    .financial-report-print__table td {
      border: 1px solid #cbd5e1 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .financial-report-print__zebra:nth-child(even) {
      background: #f1f5f9 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
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

function PrintSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 6,
        padding: '0.5rem 0.75rem',
        background: '#f8fafc',
        flex: '1 1 140px',
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#64748b', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '0.9375rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function PrintRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <tr className="financial-report-print__zebra">
      <td style={{ padding: '0.35rem 0.5rem', color: '#475569', border: '1px solid #e2e8f0' }}>{label}</td>
      <td
        style={{
          padding: '0.35rem 0.5rem',
          textAlign: 'right',
          fontWeight: emphasize ? 700 : 500,
          fontVariantNumeric: 'tabular-nums',
          border: '1px solid #e2e8f0',
        }}
      >
        {value}
      </td>
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

  if (rows.length === 0) {
    return (
      <div
        className={`financial-report-print__section${majorSection ? ' financial-report-print__section--major' : ''}`}
        style={{ marginBottom: '1.25rem' }}
      >
        <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          {section.title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
          {section.emptyMessage ?? 'Tidak ada transaksi pada periode ini'}
        </p>
      </div>
    );
  }

  const labelColSpan =
    1 +
    (hasDateTime ? 1 : 0) +
    (hasReference ? 1 : 0) +
    (hasCustomer ? 1 : 0) +
    (hasStatus ? 1 : 0) +
    (hasDueDate ? 1 : 0) +
    (hasOriginal ? 1 : 0) +
    (hasRemaining ? 1 : 0) +
    (hasQty ? 1 : 0) +
    (hasCnt ? 1 : 0) +
    (hasPct ? 1 : 0) +
    (hasDebitCredit ? 2 : 1);

  return (
    <div
      className={`financial-report-print__section${majorSection ? ' financial-report-print__section--major' : ''}`}
      style={{ marginBottom: '1.25rem' }}
    >
      <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
        {section.title}
      </h3>
      {section.truncatedNote ? (
        <p style={{ margin: '0 0 0.35rem', fontSize: '0.6875rem', color: '#64748b', fontStyle: 'italic' }}>
          {section.truncatedNote}
        </p>
      ) : null}
      <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr style={{ background: '#e2e8f0' }}>
            <th style={{ textAlign: 'center', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1', width: 28 }}>No</th>
            {hasDateTime ? <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Tanggal</th> : null}
            {hasReference ? <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Referensi</th> : null}
            <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Keterangan</th>
            {hasCustomer ? <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Pelanggan</th> : null}
            {hasQty ? <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Qty</th> : null}
            {hasCnt ? <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Jumlah</th> : null}
            {hasDueDate ? <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Jatuh Tempo</th> : null}
            {hasStatus ? <th style={{ textAlign: 'left', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Status</th> : null}
            {hasOriginal ? <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Jumlah</th> : null}
            {hasRemaining ? <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Sisa</th> : null}
            {hasPct ? <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>%</th> : null}
            {hasDebitCredit ? (
              <>
                <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Debit</th>
                <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Kredit</th>
              </>
            ) : (
              <th style={{ textAlign: 'right', padding: '0.3rem 0.4rem', border: '1px solid #cbd5e1' }}>Nominal</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: FinanceReportBreakdownRow, index) => (
            <tr key={`${row.referenceNo ?? row.label}-${index}`} className="financial-report-print__zebra">
              <td style={{ textAlign: 'center', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', color: '#64748b' }}>
                {startIndex + index + 1}
              </td>
              {hasDateTime ? (
                <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{row.dateTime ?? '—'}</td>
              ) : null}
              {hasReference ? (
                <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.referenceNo ?? '—'}</td>
              ) : null}
              <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>
                {resolveBreakdownLabel(row.label)}
                {row.subLabel ? <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{row.subLabel}</div> : null}
              </td>
              {hasCustomer ? (
                <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.customerName ?? '—'}</td>
              ) : null}
              {hasQty ? (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.quantity ?? '—'}</td>
              ) : null}
              {hasCnt ? (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.count ?? '—'}</td>
              ) : null}
              {hasDueDate ? (
                <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.dueDate ?? '—'}</td>
              ) : null}
              {hasStatus ? (
                <td style={{ padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>{row.status ?? '—'}</td>
              ) : null}
              {hasOriginal ? (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {row.originalAmount != null ? formatCurrencyIDR(row.originalAmount) : '—'}
                </td>
              ) : null}
              {hasRemaining ? (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {row.remainingAmount != null ? formatCurrencyIDR(row.remainingAmount) : formatCurrencyIDR(row.amount)}
                </td>
              ) : null}
              {hasPct ? (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0' }}>
                  {row.percentage != null ? `${row.percentage}%` : '—'}
                </td>
              ) : null}
              {hasDebitCredit ? (
                <>
                  <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {row.debit != null ? formatCurrencyIDR(row.debit) : '—'}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                    {row.credit != null ? formatCurrencyIDR(row.credit) : '—'}
                  </td>
                </>
              ) : (
                <td style={{ textAlign: 'right', padding: '0.25rem 0.4rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrencyIDR(row.amount)}
                </td>
              )}
            </tr>
          ))}
          {section.subtotal != null ? (
            <tr style={{ background: '#e2e8f0', fontWeight: 700 }}>
              <td colSpan={labelColSpan} style={{ padding: '0.35rem 0.4rem', border: '1px solid #cbd5e1', textAlign: 'right' }}>
                Subtotal
              </td>
              {hasDebitCredit ? (
                <td style={{ padding: '0.35rem 0.4rem', border: '1px solid #cbd5e1' }} />
              ) : null}
              {!hasDebitCredit ? (
                <td style={{ textAlign: 'right', padding: '0.35rem 0.4rem', border: '1px solid #cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrencyIDR(section.subtotal)}
                </td>
              ) : (
                <td style={{ textAlign: 'right', padding: '0.35rem 0.4rem', border: '1px solid #cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrencyIDR(section.subtotal)}
                </td>
              )}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
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
  const printedAt = new Date(meta.generatedAt).toLocaleString('id-ID', { timeZone: meta.timezone });

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <article
        data-testid="financial-report-print"
        className="financial-report-print"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: 720,
          margin: '0 auto',
          color: '#0f172a',
          padding: '1.5rem',
          fontSize: '12pt',
        }}
      >
        <header
          style={{
            textAlign: 'center',
            marginBottom: '1.25rem',
            borderBottom: '2px solid #0f172a',
            paddingBottom: '0.75rem',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem', fontWeight: 700 }}>{storeName}</h1>
          <p style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', color: '#64748b' }}>
            {outletName ?? 'Seluruh Cabang'}
          </p>
          <h2 style={{ fontSize: '1.0625rem', margin: '0.5rem 0 0', fontWeight: 700 }}>{title}</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>
            Periode: {periodLabel(meta)}
          </p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.6875rem', color: '#94a3b8' }}>
            Dicetak: {printedAt} · Zona waktu {meta.timezone}
          </p>
        </header>

        {reportType === 'profit-loss' && profitLoss ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <PrintSummaryCard label="Penjualan bersih" value={formatCurrencyIDR(profitLoss.revenue.netSales)} />
              <PrintSummaryCard label="Laba kotor" value={formatCurrencyIDR(profitLoss.grossProfit)} />
              <PrintSummaryCard label="Beban operasional" value={formatCurrencyIDR(profitLoss.operatingExpenses)} />
              <PrintSummaryCard label="Laba bersih" value={formatCurrencyIDR(profitLoss.netProfit)} />
            </div>
            <div className="financial-report-print__section" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Ringkasan Laba Rugi
              </h3>
              <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <tbody>
                  <PrintRow label="Penjualan kotor" value={formatCurrencyIDR(profitLoss.revenue.grossSales)} />
                  <PrintRow label="Void / refund" value={`(${formatCurrencyIDR(profitLoss.revenue.voidRefund)})`} />
                  <PrintRow label="Penjualan bersih" value={formatCurrencyIDR(profitLoss.revenue.netSales)} emphasize />
                  <PrintRow label="HPP (COGS)" value={`(${formatCurrencyIDR(profitLoss.cogs)})`} />
                  <PrintRow label="Laba kotor" value={formatCurrencyIDR(profitLoss.grossProfit)} emphasize />
                  <PrintRow label="Margin kotor" value={`${profitLoss.grossMarginPercent.toLocaleString('id-ID')}%`} />
                  <PrintRow label="Beban operasional" value={`(${formatCurrencyIDR(profitLoss.operatingExpenses)})`} />
                  {profitLoss.expensesByCategory.map((row) => (
                    <PrintRow
                      key={row.category}
                      label={`  · ${EXPENSE_CATEGORY_LABELS[row.category] ?? row.category}`}
                      value={formatCurrencyIDR(row.amount)}
                    />
                  ))}
                  <PrintRow label="Laba bersih" value={formatCurrencyIDR(profitLoss.netProfit)} emphasize />
                  <PrintRow label="Margin bersih" value={`${profitLoss.netMarginPercent.toLocaleString('id-ID')}%`} />
                </tbody>
              </table>
            </div>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <PrintSummaryCard label="Outstanding" value={formatCurrencyIDR(receivables.summary.outstanding)} />
              <PrintSummaryCard label="Baru periode" value={formatCurrencyIDR(receivables.summary.newInPeriod)} />
              <PrintSummaryCard label="Pelunasan" value={formatCurrencyIDR(receivables.summary.collectionsInPeriod)} />
              <PrintSummaryCard
                label="Jatuh tempo"
                value={`${receivables.summary.overdueCount} faktur · ${formatCurrencyIDR(receivables.summary.overdueAmount)}`}
              />
            </div>
            <div className="financial-report-print__section" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Aging Piutang
              </h3>
              <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead>
                  <tr style={{ background: '#e2e8f0' }}>
                    <th style={{ textAlign: 'left', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1' }}>Bucket</th>
                    <th style={{ textAlign: 'right', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1' }}>Faktur</th>
                    <th style={{ textAlign: 'right', padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1' }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(receivables.aging).map(([bucket, row]) => (
                    <tr key={bucket} className="financial-report-print__zebra">
                      <td style={{ padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0' }}>
                        {RECEIVABLE_AGING_BUCKET_LABELS[bucket as keyof typeof RECEIVABLE_AGING_BUCKET_LABELS]}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0' }}>{row.count}</td>
                      <td style={{ textAlign: 'right', padding: '0.3rem 0.5rem', border: '1px solid #e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrencyIDR(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <PrintSummaryCard label="Outstanding utang" value={formatCurrencyIDR(payables.summary.outstanding)} />
              <PrintSummaryCard label="Utang baru" value={formatCurrencyIDR(payables.summary.newInPeriod)} />
              <PrintSummaryCard label="Pembayaran" value={formatCurrencyIDR(payables.summary.paymentsInPeriod)} />
              <PrintSummaryCard
                label="Jatuh tempo"
                value={`${payables.summary.overdueCount} faktur · ${formatCurrencyIDR(payables.summary.overdueAmount)}`}
              />
            </div>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <PrintSummaryCard label="Kas masuk" value={formatCurrencyIDR(cashFlow.cashIn.total)} />
              <PrintSummaryCard label="Kas keluar" value={formatCurrencyIDR(cashFlow.cashOut.total)} />
              <PrintSummaryCard label="Arus kas bersih" value={formatCurrencyIDR(cashFlow.netCashFlow)} />
            </div>
            <div className="financial-report-print__section" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Ringkasan Arus Kas
              </h3>
              <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <tbody>
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 600, padding: '0.35rem 0.5rem', border: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                      Kas Masuk
                    </td>
                  </tr>
                  <PrintRow label="Penjualan tunai" value={formatCurrencyIDR(cashFlow.cashIn.cashSales)} />
                  <PrintRow label="Pelunasan piutang" value={formatCurrencyIDR(cashFlow.cashIn.receivableCollections)} />
                  <PrintRow label="Total masuk" value={formatCurrencyIDR(cashFlow.cashIn.total)} emphasize />
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 600, padding: '0.35rem 0.5rem', border: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                      Kas Keluar
                    </td>
                  </tr>
                  <PrintRow label="Bayar utang supplier" value={formatCurrencyIDR(cashFlow.cashOut.payablePayments)} />
                  <PrintRow label="Pengeluaran operasional" value={formatCurrencyIDR(cashFlow.cashOut.operatingExpenses)} />
                  <PrintRow label="Total keluar" value={formatCurrencyIDR(cashFlow.cashOut.total)} emphasize />
                  <PrintRow label="Arus kas bersih" value={formatCurrencyIDR(cashFlow.netCashFlow)} emphasize />
                </tbody>
              </table>
            </div>
            {renderBreakdownSections(cashFlow.breakdown.sections, {
              showDebitCredit: true,
              showCount: true,
              showPercentage: true,
            })}
          </>
        ) : null}

        {reportType === 'daily-summary' && dailySummary ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <PrintSummaryCard label="Omzet bersih" value={formatCurrencyIDR(dailySummary.omzet.net)} />
              <PrintSummaryCard label="Transaksi" value={String(dailySummary.omzet.transactionCount)} />
              <PrintSummaryCard
                label="Piutang baru"
                value={`${dailySummary.newReceivables.count} · ${formatCurrencyIDR(dailySummary.newReceivables.amount)}`}
              />
              <PrintSummaryCard
                label="Utang baru"
                value={`${dailySummary.newPayables.count} · ${formatCurrencyIDR(dailySummary.newPayables.amount)}`}
              />
            </div>
            <div className="financial-report-print__section" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '0.8125rem', margin: '0 0 0.5rem', fontWeight: 700, textTransform: 'uppercase' }}>
                Ringkasan Harian
              </h3>
              <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <tbody>
                  <PrintRow label="Omzet kotor" value={formatCurrencyIDR(dailySummary.omzet.gross)} />
                  <PrintRow label="Void / refund" value={`(${formatCurrencyIDR(dailySummary.omzet.voidRefundTotal)})`} />
                  <PrintRow label="Omzet bersih" value={formatCurrencyIDR(dailySummary.omzet.net)} emphasize />
                  <PrintRow label="Jumlah transaksi" value={String(dailySummary.omzet.transactionCount)} />
                </tbody>
              </table>
              <h3 style={{ fontSize: '0.8125rem', margin: '0.75rem 0 0.35rem', fontWeight: 700 }}>Payment Mix</h3>
              <table className="financial-report-print__table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <tbody>
                  {dailySummary.paymentMix.map((row) => (
                    <PrintRow
                      key={row.method}
                      label={PAYMENT_METHOD_LABELS[row.method] ?? row.method}
                      value={`${formatCurrencyIDR(row.amount)} (${row.sharePercent}%)`}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {renderBreakdownSections(dailySummary.breakdown.sections, {
              showStatus: true,
              showCount: true,
              showQuantity: true,
              showPercentage: true,
            })}
          </>
        ) : null}

        <footer
          style={{
            marginTop: '1.5rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid #cbd5e1',
            fontSize: '0.6875rem',
            color: '#64748b',
            textAlign: 'center',
          }}
        >
          Barokah Core POS · Laporan {title} · {periodLabel(meta)}
        </footer>
      </article>
    </>
  );
}
