'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  LoadingSkeleton,
  PageHeader,
  ReportDateFilters,
  SectionCard,
  StatCard,
  dashboardTokens,
} from '@/components/dashboard/dashboard-ui';
import { fetchFulfillmentQueue } from '@/lib/online-orders-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { fetchFinanceSummary, sendOverdueReminders, type FinanceSummary } from '@/lib/finance-api';
import {
  exportDailyReport,
  exportLowStockCsv,
  fetchDashboard,
  fetchCrossOutletStock,
  fetchStockReport,
  PAYMENT_METHOD_LABELS,
  type CrossOutletStockSummary,
  type DashboardReport,
  type StockReportSummary,
} from '@/lib/reports';

const gridStyle = dashboardTokens.grid;

const QUICK_LINKS = [
  { href: '/pos', label: 'Kasir', desc: 'Layar transaksi POS' },
  { href: '/dashboard/inventory', label: 'Stok', desc: 'Manajemen stok per outlet' },
  { href: '/dashboard/users', label: 'Pengguna', desc: 'Kelola akun staff' },
  { href: '/dashboard/purchase-orders', label: 'Order Distributor', desc: 'Supplier & penerimaan barang' },
  { href: '/master/products', label: 'Produk', desc: 'Kelola katalog barang' },
  { href: '/master/categories', label: 'Kategori', desc: 'Kelompok produk' },
  { href: '/pos/online-orders', label: 'Order Online', desc: 'Antrian fulfillment web' },
  { href: '/dashboard/transactions', label: 'Void & Struk', desc: 'Admin transaksi' },
  { href: '/shift/open', label: 'Buka Shift', desc: 'Operasional shift kasir' },
] as const;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${iso}T12:00:00`));
  } catch {
    return iso;
  }
}

function formatShiftTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function DashboardHomePage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [reportMode, setReportMode] = useState<'single' | 'range'>('single');
  const [date, setDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const today = todayIsoDate();
    setDate(today);
    setDateFrom(today);
    setDateTo(today);
  }, []);
  const [dashboard, setDashboard] = useState<DashboardReport | null>(null);
  const [source, setSource] = useState<'api' | 'mock' | null>(null);
  const [onlineOrderCount, setOnlineOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [stockReport, setStockReport] = useState<StockReportSummary | null>(null);
  const [crossOutletStock, setCrossOutletStock] = useState<CrossOutletStockSummary | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const reportQuery =
    reportMode === 'range'
      ? { dateFrom, dateTo, outletId: selectedOutletId ?? undefined }
      : { date, outletId: selectedOutletId ?? undefined };

  const loadDashboard = useCallback(
    async () => {
      if (needsOutletPick) {
        setLoading(false);
        setDashboard(null);
        setSource(null);
        setOnlineOrderCount(null);
        setError(null);
        return;
      }

      const hasSingleDate = reportMode !== 'range' && date;
      const hasRangeDates = reportMode === 'range' && dateFrom && dateTo;
      if (!hasSingleDate && !hasRangeDates) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await fetchDashboard(reportQuery);
        setDashboard(result.dashboard);
        setSource(result.source);

        try {
          const stock = await fetchStockReport(selectedOutletId ?? undefined);
          setStockReport(stock);
        } catch {
          setStockReport(null);
        }

        try {
          const cross = await fetchCrossOutletStock(selectedOutletId ?? undefined);
          setCrossOutletStock(cross);
        } catch {
          setCrossOutletStock(null);
        }

        try {
          const orders = await fetchFulfillmentQueue(selectedOutletId ?? undefined);
          setOnlineOrderCount(orders.length);
        } catch {
          setOnlineOrderCount(null);
        }

        try {
          const finance = await fetchFinanceSummary({
            outletId: selectedOutletId ?? undefined,
            date: reportMode === 'range' ? dateTo : date,
          });
          setFinanceSummary(finance);
        } catch {
          setFinanceSummary(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan dashboard.');
        setDashboard(null);
        setSource(null);
        setStockReport(null);
        setCrossOutletStock(null);
        setOnlineOrderCount(null);
        setFinanceSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [needsOutletPick, date, dateFrom, dateTo, selectedOutletId, reportMode],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleExport(format: 'csv' | 'pdf') {
    if (needsOutletPick) {
      setExportMessage('Pilih outlet terlebih dahulu sebelum mengekspor laporan.');
      return;
    }

    if (format === 'csv') {
      setExporting(true);
    } else {
      setExportingPdf(true);
    }
    setExportMessage(null);
    try {
      const result = await exportDailyReport({ ...reportQuery, format });
      if (result.status === 'downloaded') {
        const periodLabel =
          reportMode === 'range' && dateFrom && dateTo
            ? ` (${dateFrom} — ${dateTo})`
            : date
              ? ` (${date})`
              : '';
        setExportMessage(`File ${result.filename}${periodLabel} berhasil diunduh.`);
      } else {
        setExportMessage(result.message);
      }
    } finally {
      setExporting(false);
      setExportingPdf(false);
    }
  }

  const pulse = dashboard?.pulse;

  return (
    <div style={{ maxWidth: '1100px' }}>
      <PageHeader
        title="Ringkasan Operasional"
        description={
          dashboard
            ? dashboard.isRange && dashboard.dateFrom && dashboard.dateTo
              ? `${formatDisplayDate(dashboard.dateFrom)} — ${formatDisplayDate(dashboard.dateTo)}`
              : formatDisplayDate(dashboard.date)
            : 'Pantau omzet, shift, dan komposisi pembayaran harian toko Anda.'
        }
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <>
            <ReportDateFilters
              mode={reportMode}
              onModeChange={setReportMode}
              singleDate={date}
              onSingleDateChange={setDate}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <Button type="button" variant="secondary" onClick={() => void loadDashboard()} disabled={loading}>
              {loading ? 'Memuat…' : 'Muat ulang'}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleExport('csv')}
              disabled={exporting || needsOutletPick}
            >
              {exporting ? 'Mengekspor…' : 'Ekspor CSV'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExport('pdf')}
              disabled={exportingPdf || needsOutletPick}
            >
              {exportingPdf ? 'Mengekspor…' : 'Ekspor PDF'}
            </Button>
          </>
        }
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">
          Akun Anda memiliki lebih dari satu outlet. Pilih cabang di header sebelum memuat ringkasan.
        </AlertBanner>
      ) : null}

      {exportMessage ? <AlertBanner variant="success">{exportMessage}</AlertBanner> : null}

      {financeSummary && financeSummary.overdueReceivableCount > 0 ? (
        <AlertBanner variant="error">
          <strong>{financeSummary.overdueReceivableCount} piutang jatuh tempo</strong> — total{' '}
          {formatCurrencyIDR(financeSummary.overdueReceivableAmount)}.{' '}
          <Link href="/dashboard/receivables?status=OVERDUE" style={{ color: 'inherit', fontWeight: 600 }}>
            Lihat daftar →
          </Link>
        </AlertBanner>
      ) : null}

      {reminderMessage ? <AlertBanner variant="success">{reminderMessage}</AlertBanner> : null}

      {financeSummary ? (
        <SectionCard title="Ringkasan Keuangan" description="Piutang, utang, deposit, dan kas tunai hari ini.">
          <div style={{ ...gridStyle, marginBottom: '0.75rem' }}>
            <StatCard
              label="Total Piutang"
              value={formatCurrencyIDR(financeSummary.receivableOutstanding)}
              accent={financeSummary.receivableOutstanding > 0 ? 'warning' : 'success'}
            />
            <StatCard
              label="Total Utang"
              value={formatCurrencyIDR(financeSummary.payableOutstanding)}
              accent={financeSummary.payableOutstanding > 0 ? 'warning' : 'default'}
            />
            <StatCard
              label="Saldo Deposit"
              value={formatCurrencyIDR(financeSummary.depositBalance)}
            />
            <StatCard
              label="Kas Hari Ini"
              value={formatCurrencyIDR(financeSummary.cashToday)}
              accent="success"
              hint="Pembayaran tunai transaksi selesai"
            />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.8125rem' }}>
            <Link href="/dashboard/receivables" style={{ color: '#2563eb' }}>
              Detail piutang →
            </Link>
            <Link href="/dashboard/payables" style={{ color: '#2563eb' }}>
              Detail utang →
            </Link>
            <Link href="/dashboard/deposits" style={{ color: '#2563eb' }}>
              Detail deposit →
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/receivables/aging">
              <Button type="button" variant="secondary">
                Aging Piutang
              </Button>
            </Link>
            {financeSummary.overdueReceivableCount > 0 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={sendingReminder}
                onClick={() => {
                  setSendingReminder(true);
                  setReminderMessage(null);
                  void sendOverdueReminders(selectedOutletId ?? undefined)
                    .then((r) => setReminderMessage(r.message))
                    .catch((err) =>
                      setReminderMessage(err instanceof Error ? err.message : 'Gagal mengirim pengingat.'),
                    )
                    .finally(() => setSendingReminder(false));
                }}
              >
                {sendingReminder ? 'Memproses…' : 'Kirim Pengingat (Stub)'}
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {source === 'mock' && !loading && !needsOutletPick ? (
        <AlertBanner variant="warning">
          API dashboard belum tersedia — menampilkan data kosong sementara. Setelah backend siap, widget akan terisi
          otomatis dari GET /api/v1/reports/dashboard.
        </AlertBanner>
      ) : null}

      {error ? (
        <AlertBanner variant="error" onRetry={() => void loadDashboard()}>
          {error}
        </AlertBanner>
      ) : null}

      <SectionCard title="Akses Cepat" description="Navigasi ke modul operasional yang paling sering digunakan.">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                textDecoration: 'none',
                background: '#f8fafc',
                color: '#0f172a',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9375rem' }}>
                {link.label}
                {link.href === '/pos/online-orders' && onlineOrderCount != null && onlineOrderCount > 0 ? (
                  <span
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.45rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {onlineOrderCount}
                  </span>
                ) : null}
              </span>
              <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
                {link.desc}
              </span>
            </Link>
          ))}
        </div>
      </SectionCard>

      {loading && !dashboard && !needsOutletPick ? <LoadingSkeleton rows={4} /> : null}

      {dashboard && pulse && (
        <>
          <div style={{ ...gridStyle, marginBottom: '1.5rem' }}>
            <StatCard
              label={dashboard.isRange ? 'Penjualan Rentang' : 'Penjualan Hari Ini'}
              ariaLabel="Omzet harian"
              value={formatCurrencyIDR(pulse.grossOmzet)}
              accent="success"
            />
            <StatCard
              label="Jumlah Transaksi"
              ariaLabel="Jumlah transaksi"
              value={pulse.transactionCount.toLocaleString('id-ID')}
            />
            <StatCard
              label="Rata-rata per Transaksi"
              value={
                pulse.transactionCount > 0
                  ? formatCurrencyIDR(Math.round(pulse.grossOmzet / pulse.transactionCount))
                  : formatCurrencyIDR(0)
              }
            />
            <StatCard
              label="Shift Aktif"
              ariaLabel="Shift aktif"
              value={dashboard.operations.activeShifts.toLocaleString('id-ID')}
              hint={`${dashboard.operations.shiftsClosedToday} shift ditutup hari ini`}
              accent={dashboard.operations.activeShifts > 0 ? 'success' : 'default'}
            />
            {pulse.voidRefundCount > 0 ? (
              <StatCard
                label="Void / Refund"
                value={pulse.voidRefundCount.toLocaleString('id-ID')}
                hint={`Total ${formatCurrencyIDR(pulse.voidRefundTotal)}`}
                accent="error"
              />
            ) : null}
          </div>

          <SectionCard
            title={dashboard.isRange ? 'Shift dalam Rentang' : 'Shift Hari Ini'}
            style={{ marginBottom: '1.5rem' }}
          >
            {dashboard.shiftSummaries.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>Belum ada shift dibuka pada tanggal ini.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: '#64748b', fontWeight: 600 }}>Kasir</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600 }}>Buka</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600 }}>Tutup</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontWeight: 600 }}>Trx</th>
                      <th style={{ padding: '0.5rem 0.75rem 0.75rem 0', color: '#64748b', fontWeight: 600 }}>Omzet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.shiftSummaries.map((shift) => (
                      <tr key={shift.shiftId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: '#334155' }}>{shift.cashierName}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: shift.isOpen ? '#dcfce7' : '#f1f5f9',
                              color: shift.isOpen ? '#166534' : '#64748b',
                            }}
                          >
                            {shift.isOpen ? 'Aktif' : 'Selesai'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {formatShiftTime(shift.openedAt)}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {shift.closedAt ? formatShiftTime(shift.closedAt) : '—'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
                          {shift.transactionCount.toLocaleString('id-ID')}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrencyIDR(shift.grossOmzet)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {stockReport ? (
            <SectionCard title="Ringkasan Stok Cabang" style={{ marginBottom: '1.5rem' }}>
              <div style={{ ...gridStyle, marginBottom: '1rem' }}>
                <StatCard label="Total SKU" value={stockReport.totalSkus.toLocaleString('id-ID')} />
                <StatCard
                  label="Stok Rendah"
                  value={stockReport.lowStockCount.toLocaleString('id-ID')}
                  accent={stockReport.lowStockCount > 0 ? 'warning' : 'success'}
                />
                <StatCard
                  label="Total Qty (satuan dasar)"
                  value={stockReport.totalQuantity.toLocaleString('id-ID')}
                />
                {stockReport.hasCostData ? (
                  <StatCard
                    label="Nilai Stok (HPP)"
                    value={formatCurrencyIDR(stockReport.stockValue)}
                    hint="Qty × harga beli per SKU"
                  />
                ) : null}
              </div>
              {stockReport.topLowStock.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void exportLowStockCsv(selectedOutletId ?? undefined)}
                    >
                      Export CSV Stok Rendah
                    </Button>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: '#64748b' }}>SKU</th>
                        <th style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>Produk</th>
                        <th style={{ padding: '0.5rem 0.75rem 0.75rem 0', color: '#64748b' }}>Stok / Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockReport.topLowStock.map((item) => (
                        <tr key={item.sku} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>{item.sku}</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>{item.displayName}</td>
                          <td style={{ padding: '0.65rem 0.75rem 0.75rem 0', fontVariantNumeric: 'tabular-nums' }}>
                            {item.quantity.toLocaleString('id-ID')} / {item.minStock.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem' }}>
                    <Link href="/dashboard/inventory" style={{ color: '#2563eb' }}>
                      Kelola stok & transfer antar cabang →
                    </Link>
                  </p>
                </div>
              ) : (
                <p style={{ margin: 0, color: '#64748b' }}>Semua SKU di atas stok minimum.</p>
              )}
            </SectionCard>
          ) : null}

          {crossOutletStock && crossOutletStock.products.length > 0 ? (
            <SectionCard title="Stok Cabang Lain" style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
                Visibilitas read-only stok SKU yang juga ada di cabang lain (MVP multi-outlet).
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem 0.5rem 0', color: '#64748b' }}>SKU</th>
                      <th style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>Produk</th>
                      {crossOutletStock.outlets.map((outlet) => (
                        <th key={outlet.id} style={{ padding: '0.5rem 0.75rem', color: '#64748b' }}>
                          {outlet.code}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crossOutletStock.products.map((product) => (
                      <tr key={product.productId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem 0.65rem 0' }}>{product.sku}</td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>{product.displayName}</td>
                        {crossOutletStock.outlets.map((outlet) => {
                          const row = product.byOutlet.find((o) => o.outletId === outlet.id);
                          return (
                            <td
                              key={outlet.id}
                              style={{ padding: '0.65rem 0.75rem', fontVariantNumeric: 'tabular-nums' }}
                            >
                              {row
                                ? `${row.quantity.toLocaleString('id-ID')}${product.unitSymbol ? ` ${product.unitSymbol}` : ''}`
                                : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Komposisi Pembayaran">
            {pulse.paymentMix.length === 0 ? (
              <p style={{ margin: 0, color: '#64748b' }}>Belum ada transaksi pada tanggal ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pulse.paymentMix.map((item) => {
                  const label = PAYMENT_METHOD_LABELS[item.method] ?? item.method;
                  const pct = Math.round(item.sharePercent);
                  return (
                    <div key={String(item.method)}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.35rem',
                          fontSize: '0.9375rem',
                        }}
                      >
                        <span style={{ fontWeight: 500, color: '#334155' }}>{label}</span>
                        <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrencyIDR(item.amount)} · {pct}% · {item.count} trx
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          background: '#e2e8f0',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                            height: '100%',
                            background: '#16a34a',
                            borderRadius: '4px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
