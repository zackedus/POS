'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FINANCE_REPORT_PERIOD_LABELS,
  FINANCE_REPORT_TYPE_LABELS,
  RECEIVABLE_AGING_BUCKET_LABELS,
  formatCurrencyIDR,
  type CashFlowFinanceReport,
  type DailySummaryFinanceReport,
  type FinanceReportPeriod,
  type FinanceReportType,
  type PayablesFinanceReport,
  type ProfitLossReport,
  type ReceivablesFinanceReport,
} from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import {
  AlertBanner,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatCard,
  dashboardTokens,
} from '@/components/dashboard/dashboard-ui';
import { FinanceReportBreakdownSections } from '@/components/dashboard/reports/FinanceReportBreakdownTable';
import { FinancialReportPrint } from '@/components/dashboard/reports/FinancialReportPrint';
import {
  fetchCashFlowReport,
  fetchDailySummaryReport,
  fetchPayablesFinanceReport,
  fetchProfitLossReport,
  fetchReceivablesFinanceReport,
  printFinancialReport,
  todayIsoDate,
} from '@/lib/finance-reports-api';
import { mapApiError } from '@/lib/api-client';
import { PAYMENT_METHOD_LABELS } from '@/lib/reports';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const REPORT_TABS: FinanceReportType[] = ['profit-loss', 'receivables', 'payables', 'cash-flow', 'daily-summary'];

const PERIOD_OPTIONS: FinanceReportPeriod[] = ['day', 'week', 'month', 'year'];

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operasional',
  LOADING_UNLOADING: 'Bongkar Muat',
  SHIPPING: 'Pengiriman',
  OTHER: 'Lainnya',
};

export function FinanceReportsPageClient() {
  const { selectedOutletId, needsOutletPick, outlets } = useOutletSelection();
  const [activeTab, setActiveTab] = useState<FinanceReportType>('profit-loss');
  const [periodMode, setPeriodMode] = useState<'preset' | 'custom'>('preset');
  const [period, setPeriod] = useState<FinanceReportPeriod>('month');
  const [anchorDate, setAnchorDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [receivables, setReceivables] = useState<ReceivablesFinanceReport | null>(null);
  const [payables, setPayables] = useState<PayablesFinanceReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowFinanceReport | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummaryFinanceReport | null>(null);

  useEffect(() => {
    const today = todayIsoDate();
    setAnchorDate(today);
    setDateFrom(today);
    setDateTo(today);
  }, []);

  const queryParams = useMemo(() => {
    const base = { outletId: selectedOutletId ?? undefined };
    if (activeTab === 'daily-summary') {
      return { date: anchorDate || todayIsoDate(), ...base };
    }
    if (periodMode === 'custom') {
      return { from: dateFrom, to: dateTo, ...base };
    }
    return { period, date: anchorDate || todayIsoDate(), ...base };
  }, [activeTab, anchorDate, dateFrom, dateTo, period, periodMode, selectedOutletId]);

  const outletName = useMemo(() => {
    if (!selectedOutletId) return undefined;
    return outlets.find((o) => o.id === selectedOutletId)?.label;
  }, [outlets, selectedOutletId]);

  const activeMeta =
    profitLoss?.meta ??
    receivables?.meta ??
    payables?.meta ??
    cashFlow?.meta ??
    dailySummary?.meta ??
    null;

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'daily-summary') {
        const data = await fetchDailySummaryReport({
          date: anchorDate || todayIsoDate(),
          outletId: selectedOutletId ?? undefined,
        });
        setDailySummary(data);
        return;
      }

      if (periodMode === 'custom' && (!dateFrom || !dateTo)) {
        setLoading(false);
        return;
      }

      switch (activeTab) {
        case 'profit-loss':
          setProfitLoss(await fetchProfitLossReport(queryParams));
          break;
        case 'receivables':
          setReceivables(await fetchReceivablesFinanceReport(queryParams));
          break;
        case 'payables':
          setPayables(await fetchPayablesFinanceReport(queryParams));
          break;
        case 'cash-flow':
          setCashFlow(await fetchCashFlowReport(queryParams));
          break;
        default:
          break;
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat laporan keuangan.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateFrom, dateTo, periodMode, queryParams]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <>
      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; display: block !important; }
          .print-only { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
        <PageHeader
          title="Laporan Keuangan"
          description="Laba rugi, piutang, utang, arus kas, dan ringkasan harian — cetak atau export PDF."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Keuangan', href: '/dashboard/finance' },
            { label: 'Laporan Keuangan' },
          ]}
          actions={
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button type="button" variant="secondary" onClick={() => void loadReport()} disabled={loading}>
                {loading ? 'Memuat…' : 'Muat ulang'}
              </Button>
              <Button type="button" variant="primary" onClick={printFinancialReport} disabled={!activeMeta}>
                Cetak / PDF
              </Button>
            </div>
          }
        />

        {needsOutletPick ? (
          <AlertBanner variant="warning">
            Pilih cabang di header untuk filter per outlet, atau biarkan kosong untuk agregat tenant (jika diizinkan).
          </AlertBanner>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {REPORT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 0.875rem',
                borderRadius: 8,
                border: activeTab === tab ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: activeTab === tab ? '#eff6ff' : '#fff',
                color: activeTab === tab ? '#1d4ed8' : '#334155',
                fontWeight: activeTab === tab ? 600 : 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {FINANCE_REPORT_TYPE_LABELS[tab]}
            </button>
          ))}
        </div>

        {activeTab !== 'daily-summary' ? (
          <SectionCard title="Periode" description="Preset atau rentang tanggal custom (WIB).">
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'grid', gap: 4, fontSize: '0.8125rem' }}>
                Mode
                <select
                  value={periodMode}
                  onChange={(e) => setPeriodMode(e.target.value as 'preset' | 'custom')}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
                >
                  <option value="preset">Preset</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {periodMode === 'preset' ? (
                <>
                  <label style={{ display: 'grid', gap: 4, fontSize: '0.8125rem' }}>
                    Periode
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value as FinanceReportPeriod)}
                      style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
                    >
                      {PERIOD_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {FINANCE_REPORT_PERIOD_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Input
                    label="Tanggal acuan"
                    type="date"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Input label="Dari" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  <Input label="Sampai" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </>
              )}
            </div>
          </SectionCard>
        ) : (
          <SectionCard title="Tanggal" description="Ringkasan operasional satu hari.">
            <Input label="Tanggal" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
          </SectionCard>
        )}

        {error ? (
          <AlertBanner variant="error" onRetry={() => void loadReport()}>
            {error}
          </AlertBanner>
        ) : null}

        {loading ? <LoadingSkeleton rows={4} /> : null}

        {!loading && activeTab === 'profit-loss' && profitLoss ? (
          <ProfitLossPanel report={profitLoss} />
        ) : null}
        {!loading && activeTab === 'receivables' && receivables ? (
          <ReceivablesPanel report={receivables} />
        ) : null}
        {!loading && activeTab === 'payables' && payables ? <PayablesPanel report={payables} /> : null}
        {!loading && activeTab === 'cash-flow' && cashFlow ? <CashFlowPanel report={cashFlow} /> : null}
        {!loading && activeTab === 'daily-summary' && dailySummary ? (
          <DailySummaryPanel report={dailySummary} />
        ) : null}

        <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
          Penjualan tempo diakui saat transaksi. HPP estimasi dari cost price produk saat ini.{' '}
          <Link href="/dashboard/finance" style={{ color: '#2563eb' }}>
            Kembali ke hub Keuangan
          </Link>
        </p>
      </div>

      {activeMeta ? (
        <div className="print-only">
          <FinancialReportPrint
            reportType={activeTab}
            meta={activeMeta}
            profitLoss={profitLoss}
            receivables={receivables}
            payables={payables}
            cashFlow={cashFlow}
            dailySummary={dailySummary}
            outletName={outletName}
          />
        </div>
      ) : null}
    </>
  );
}

function ProfitLossPanel({ report }: { report: ProfitLossReport }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={dashboardTokens.grid}>
        <StatCard label="Penjualan bersih" value={formatCurrencyIDR(report.revenue.netSales)} accent="default" />
        <StatCard label="Laba kotor" value={formatCurrencyIDR(report.grossProfit)} accent="success" />
        <StatCard label="Beban operasional" value={formatCurrencyIDR(report.operatingExpenses)} accent="warning" />
        <StatCard label="Laba bersih" value={formatCurrencyIDR(report.netProfit)} accent="success" />
      </div>
      <SectionCard title="Rincian Laba Rugi">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            <Row label="Penjualan kotor" value={formatCurrencyIDR(report.revenue.grossSales)} />
            <Row label="Void / refund" value={`− ${formatCurrencyIDR(report.revenue.voidRefund)}`} />
            <Row label="Penjualan bersih" value={formatCurrencyIDR(report.revenue.netSales)} bold />
            <Row label="HPP (COGS)" value={`− ${formatCurrencyIDR(report.cogs)}`} />
            <Row label="Laba kotor" value={formatCurrencyIDR(report.grossProfit)} bold />
            <Row label="Margin kotor" value={`${report.grossMarginPercent}%`} />
            <Row label="Beban operasional" value={`− ${formatCurrencyIDR(report.operatingExpenses)}`} />
            {report.expensesByCategory.map((row) => (
              <Row
                key={row.category}
                label={`  ${EXPENSE_CATEGORY_LABELS[row.category] ?? row.category}`}
                value={formatCurrencyIDR(row.amount)}
              />
            ))}
            <Row label="Laba bersih" value={formatCurrencyIDR(report.netProfit)} bold />
          </tbody>
        </table>
      </SectionCard>
      <FinanceReportBreakdownSections sections={report.breakdown.sections} />
    </div>
  );
}

function ReceivablesPanel({ report }: { report: ReceivablesFinanceReport }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={dashboardTokens.grid}>
        <StatCard label="Outstanding" value={formatCurrencyIDR(report.summary.outstanding)} accent="warning" />
        <StatCard label="Baru periode" value={formatCurrencyIDR(report.summary.newInPeriod)} />
        <StatCard label="Pelunasan" value={formatCurrencyIDR(report.summary.collectionsInPeriod)} accent="success" />
        <StatCard
          label="Jatuh tempo"
          value={formatCurrencyIDR(report.summary.overdueAmount)}
          hint={`${report.summary.overdueCount} faktur`}
          accent="warning"
        />
      </div>
      <SectionCard title="Aging Piutang">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0' }}>Bucket</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Faktur</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Nominal</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(report.aging).map(([bucket, row]) => (
              <tr key={bucket} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem 0' }}>
                  {RECEIVABLE_AGING_BUCKET_LABELS[bucket as keyof typeof RECEIVABLE_AGING_BUCKET_LABELS]}
                </td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{row.count}</td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{formatCurrencyIDR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <FinanceReportBreakdownSections sections={report.breakdown.sections} />
    </div>
  );
}

function PayablesPanel({ report }: { report: PayablesFinanceReport }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={dashboardTokens.grid}>
        <StatCard label="Outstanding utang" value={formatCurrencyIDR(report.summary.outstanding)} accent="warning" />
        <StatCard label="Utang baru" value={formatCurrencyIDR(report.summary.newInPeriod)} />
        <StatCard label="Pembayaran" value={formatCurrencyIDR(report.summary.paymentsInPeriod)} accent="success" />
        <StatCard
          label="Jatuh tempo"
          value={formatCurrencyIDR(report.summary.overdueAmount)}
          hint={`${report.summary.overdueCount} faktur`}
          accent="warning"
        />
      </div>
      <FinanceReportBreakdownSections sections={report.breakdown.sections} />
    </div>
  );
}

function CashFlowPanel({ report }: { report: CashFlowFinanceReport }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={dashboardTokens.grid}>
        <StatCard label="Kas masuk" value={formatCurrencyIDR(report.cashIn.total)} accent="success" />
        <StatCard label="Kas keluar" value={formatCurrencyIDR(report.cashOut.total)} accent="warning" />
        <StatCard
          label="Arus kas bersih"
          value={formatCurrencyIDR(report.netCashFlow)}
          accent={report.netCashFlow >= 0 ? 'success' : 'warning'}
        />
      </div>
      <SectionCard title="Rincian Arus Kas">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <tbody>
            <Row label="Penjualan tunai" value={formatCurrencyIDR(report.cashIn.cashSales)} />
            <Row label="Pelunasan piutang" value={formatCurrencyIDR(report.cashIn.receivableCollections)} />
            <Row label="Bayar utang" value={`− ${formatCurrencyIDR(report.cashOut.payablePayments)}`} />
            <Row label="Pengeluaran" value={`− ${formatCurrencyIDR(report.cashOut.operatingExpenses)}`} />
          </tbody>
        </table>
      </SectionCard>
      <FinanceReportBreakdownSections sections={report.breakdown.sections} />
    </div>
  );
}

function DailySummaryPanel({ report }: { report: DailySummaryFinanceReport }) {
  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={dashboardTokens.grid}>
        <StatCard label="Omzet bersih" value={formatCurrencyIDR(report.omzet.net)} accent="default" />
        <StatCard label="Transaksi" value={String(report.omzet.transactionCount)} />
        <StatCard
          label="Piutang baru"
          value={formatCurrencyIDR(report.newReceivables.amount)}
          hint={`${report.newReceivables.count} faktur`}
        />
        <StatCard
          label="Utang baru"
          value={formatCurrencyIDR(report.newPayables.amount)}
          hint={`${report.newPayables.count} faktur`}
        />
      </div>
      <SectionCard title="Payment Mix">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0' }}>Metode</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Nominal</th>
              <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Share</th>
            </tr>
          </thead>
          <tbody>
            {report.paymentMix.map((row) => (
              <tr key={row.method} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.5rem 0' }}>{PAYMENT_METHOD_LABELS[row.method] ?? row.method}</td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{formatCurrencyIDR(row.amount)}</td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{row.sharePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <FinanceReportBreakdownSections sections={report.breakdown.sections} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '0.5rem 0', color: bold ? '#0f172a' : '#475569', fontWeight: bold ? 600 : 400 }}>
        {label}
      </td>
      <td
        style={{
          padding: '0.5rem 0',
          textAlign: 'right',
          fontWeight: bold ? 700 : 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </td>
    </tr>
  );
}
