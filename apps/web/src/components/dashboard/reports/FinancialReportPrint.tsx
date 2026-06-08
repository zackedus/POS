'use client';

import {
  FINANCE_REPORT_PERIOD_LABELS,
  FINANCE_REPORT_TYPE_LABELS,
  RECEIVABLE_AGING_BUCKET_LABELS,
  formatCurrencyIDR,
  type CashFlowFinanceReport,
  type DailySummaryFinanceReport,
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

function PrintBreakdownSection({
  section,
  showReference,
  showDueDate,
  showStatus,
  showQuantity,
  showCount,
  showPercentage,
}: {
  section: FinanceReportBreakdownSection;
  showReference?: boolean;
  showDueDate?: boolean;
  showStatus?: boolean;
  showQuantity?: boolean;
  showCount?: boolean;
  showPercentage?: boolean;
}) {
  if (section.rows.length === 0) {
    return (
      <div style={{ marginBottom: '1rem', pageBreakInside: 'avoid' }}>
        <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.35rem' }}>{section.title}</h3>
        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
          {section.emptyMessage ?? 'Tidak ada data pada periode ini'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem', pageBreakInside: 'avoid' }}>
      <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.35rem' }}>{section.title}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ textAlign: 'left', padding: '0.25rem 0' }}>Keterangan</th>
            {showReference ? <th style={{ textAlign: 'left', padding: '0.25rem' }}>No. Ref</th> : null}
            {showQuantity ? <th style={{ textAlign: 'right', padding: '0.25rem' }}>Qty</th> : null}
            {showCount ? <th style={{ textAlign: 'right', padding: '0.25rem' }}>Jumlah</th> : null}
            {showDueDate ? <th style={{ textAlign: 'left', padding: '0.25rem' }}>Jatuh Tempo</th> : null}
            {showStatus ? <th style={{ textAlign: 'left', padding: '0.25rem' }}>Status</th> : null}
            {showPercentage ? <th style={{ textAlign: 'right', padding: '0.25rem' }}>%</th> : null}
            <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Nominal</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, index) => (
            <tr key={`${row.label}-${index}`} style={{ background: index % 2 === 1 ? '#f8fafc' : 'transparent' }}>
              <td style={{ padding: '0.25rem 0' }}>
                {resolveBreakdownLabel(row.label)}
                {row.subLabel ? <div style={{ color: '#64748b' }}>{row.subLabel}</div> : null}
              </td>
              {showReference ? <td style={{ padding: '0.25rem' }}>{row.referenceNo ?? '—'}</td> : null}
              {showQuantity ? <td style={{ textAlign: 'right', padding: '0.25rem' }}>{row.quantity ?? '—'}</td> : null}
              {showCount ? <td style={{ textAlign: 'right', padding: '0.25rem' }}>{row.count ?? '—'}</td> : null}
              {showDueDate ? <td style={{ padding: '0.25rem' }}>{row.dueDate ?? '—'}</td> : null}
              {showStatus ? <td style={{ padding: '0.25rem' }}>{row.status ?? '—'}</td> : null}
              {showPercentage ? (
                <td style={{ textAlign: 'right', padding: '0.25rem' }}>
                  {row.percentage != null ? `${row.percentage}%` : '—'}
                </td>
              ) : null}
              <td style={{ textAlign: 'right', padding: '0.25rem 0' }}>{formatCurrencyIDR(row.amount)}</td>
            </tr>
          ))}
          {section.subtotal != null ? (
            <tr style={{ borderTop: '1px solid #cbd5e1' }}>
              <td
                colSpan={
                  1 +
                  (showReference ? 1 : 0) +
                  (showQuantity ? 1 : 0) +
                  (showCount ? 1 : 0) +
                  (showDueDate ? 1 : 0) +
                  (showStatus ? 1 : 0) +
                  (showPercentage ? 1 : 0)
                }
                style={{ padding: '0.35rem 0', fontWeight: 700 }}
              >
                Subtotal
              </td>
              <td style={{ textAlign: 'right', padding: '0.35rem 0', fontWeight: 700 }}>
                {formatCurrencyIDR(section.subtotal)}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function PrintRow({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '0.35rem 0', color: '#475569' }}>{label}</td>
      <td
        style={{
          padding: '0.35rem 0',
          textAlign: 'right',
          fontWeight: emphasize ? 700 : 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </td>
    </tr>
  );
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

  return (
    <article
      data-testid="financial-report-print"
      className="financial-report-print"
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 720,
        margin: '0 auto',
        color: '#0f172a',
        padding: '1.5rem',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.25rem' }}>{storeName}</h1>
        {outletName ? (
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>{outletName}</p>
        ) : (
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#64748b' }}>Seluruh Cabang</p>
        )}
        <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>{periodLabel(meta)}</p>
      </header>

      {reportType === 'profit-loss' && profitLoss ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            <PrintRow label="Penjualan kotor" value={formatCurrencyIDR(profitLoss.revenue.grossSales)} />
            <PrintRow label="Void / refund" value={`(${formatCurrencyIDR(profitLoss.revenue.voidRefund)})`} />
            <PrintRow label="Penjualan bersih" value={formatCurrencyIDR(profitLoss.revenue.netSales)} emphasize />
            <PrintRow label="HPP (COGS)" value={`(${formatCurrencyIDR(profitLoss.cogs)})`} />
            <PrintRow label="Laba kotor" value={formatCurrencyIDR(profitLoss.grossProfit)} emphasize />
            <PrintRow
              label="Margin kotor"
              value={`${profitLoss.grossMarginPercent.toLocaleString('id-ID')}%`}
            />
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
      ) : null}

      {reportType === 'profit-loss' && profitLoss
        ? profitLoss.breakdown.sections.map((section) => (
            <PrintBreakdownSection
              key={section.title}
              section={section}
              showCount
              showQuantity
              showPercentage
            />
          ))
        : null}

      {reportType === 'receivables' && receivables ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <tbody>
              <PrintRow label="Outstanding piutang" value={formatCurrencyIDR(receivables.summary.outstanding)} emphasize />
              <PrintRow label="Piutang baru (periode)" value={formatCurrencyIDR(receivables.summary.newInPeriod)} />
              <PrintRow label="Pelunasan (periode)" value={formatCurrencyIDR(receivables.summary.collectionsInPeriod)} />
              <PrintRow label="Jatuh tempo" value={`${receivables.summary.overdueCount} faktur · ${formatCurrencyIDR(receivables.summary.overdueAmount)}`} />
            </tbody>
          </table>
          <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Aging Piutang</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '0.35rem 0' }}>Bucket</th>
                <th style={{ textAlign: 'right', padding: '0.35rem 0' }}>Jumlah</th>
                <th style={{ textAlign: 'right', padding: '0.35rem 0' }}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(receivables.aging).map(([bucket, row]) => (
                <tr key={bucket}>
                  <td style={{ padding: '0.3rem 0' }}>
                    {RECEIVABLE_AGING_BUCKET_LABELS[bucket as keyof typeof RECEIVABLE_AGING_BUCKET_LABELS]}
                  </td>
                  <td style={{ textAlign: 'right', padding: '0.3rem 0' }}>{row.count}</td>
                  <td style={{ textAlign: 'right', padding: '0.3rem 0' }}>{formatCurrencyIDR(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {receivables.breakdown.sections.map((section) => (
            <PrintBreakdownSection
              key={section.title}
              section={section}
              showReference
              showDueDate
            />
          ))}
        </>
      ) : null}

      {reportType === 'payables' && payables ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <tbody>
              <PrintRow label="Outstanding utang" value={formatCurrencyIDR(payables.summary.outstanding)} emphasize />
              <PrintRow label="Utang baru (periode)" value={formatCurrencyIDR(payables.summary.newInPeriod)} />
              <PrintRow label="Pembayaran (periode)" value={formatCurrencyIDR(payables.summary.paymentsInPeriod)} />
              <PrintRow label="Jatuh tempo" value={`${payables.summary.overdueCount} faktur · ${formatCurrencyIDR(payables.summary.overdueAmount)}`} />
            </tbody>
          </table>
          {payables.breakdown.sections.map((section) => (
            <PrintBreakdownSection
              key={section.title}
              section={section}
              showReference
              showDueDate
              showStatus
            />
          ))}
        </>
      ) : null}

      {reportType === 'cash-flow' && cashFlow ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            <tr>
              <td colSpan={2} style={{ fontWeight: 600, paddingTop: '0.5rem' }}>
                Kas Masuk
              </td>
            </tr>
            <PrintRow label="Penjualan tunai" value={formatCurrencyIDR(cashFlow.cashIn.cashSales)} />
            <PrintRow label="Pelunasan piutang" value={formatCurrencyIDR(cashFlow.cashIn.receivableCollections)} />
            <PrintRow label="Total masuk" value={formatCurrencyIDR(cashFlow.cashIn.total)} emphasize />
            <tr>
              <td colSpan={2} style={{ fontWeight: 600, paddingTop: '0.75rem' }}>
                Kas Keluar
              </td>
            </tr>
            <PrintRow label="Bayar utang supplier" value={formatCurrencyIDR(cashFlow.cashOut.payablePayments)} />
            <PrintRow label="Pengeluaran operasional" value={formatCurrencyIDR(cashFlow.cashOut.operatingExpenses)} />
            <PrintRow label="Total keluar" value={formatCurrencyIDR(cashFlow.cashOut.total)} emphasize />
            <PrintRow label="Arus kas bersih" value={formatCurrencyIDR(cashFlow.netCashFlow)} emphasize />
          </tbody>
        </table>
      ) : null}

      {reportType === 'cash-flow' && cashFlow
        ? cashFlow.breakdown.sections.map((section) => (
            <PrintBreakdownSection
              key={section.title}
              section={section}
              showCount
              showPercentage
            />
          ))
        : null}

      {reportType === 'daily-summary' && dailySummary ? (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: '1rem' }}>
            <tbody>
              <PrintRow label="Omzet kotor" value={formatCurrencyIDR(dailySummary.omzet.gross)} />
              <PrintRow label="Void / refund" value={`(${formatCurrencyIDR(dailySummary.omzet.voidRefundTotal)})`} />
              <PrintRow label="Omzet bersih" value={formatCurrencyIDR(dailySummary.omzet.net)} emphasize />
              <PrintRow label="Jumlah transaksi" value={String(dailySummary.omzet.transactionCount)} />
              <PrintRow
                label="Piutang baru"
                value={`${dailySummary.newReceivables.count} · ${formatCurrencyIDR(dailySummary.newReceivables.amount)}`}
              />
              <PrintRow
                label="Utang baru"
                value={`${dailySummary.newPayables.count} · ${formatCurrencyIDR(dailySummary.newPayables.amount)}`}
              />
            </tbody>
          </table>
          <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.5rem' }}>Payment Mix</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
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
          {dailySummary.breakdown.sections.map((section) => (
            <PrintBreakdownSection
              key={section.title}
              section={section}
              showCount
              showQuantity
              showPercentage
            />
          ))}
        </>
      ) : null}

      <footer style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center' }}>
        Barokah Core POS · Dicetak {new Date(meta.generatedAt).toLocaleString('id-ID')} · Zona waktu {meta.timezone}
      </footer>
    </article>
  );
}
