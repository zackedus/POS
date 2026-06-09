'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ANALYTICS_PERIOD_LABELS,
  formatCurrencyIDR,
  getTodayDate,
  type AnalyticsKpiMetric,
  type AnalyticsPeriod,
  type AnalyticsSummary,
} from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import {
  AlertBanner,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatCard,
  dashboardTokens,
} from '@/components/dashboard/dashboard-ui';
import {
  downloadAnalyticsMarginCsv,
  downloadAnalyticsWeeklyCsv,
  fetchAnalyticsSummary,
} from '@/lib/analytics-api';
import { mapApiError } from '@/lib/api-client';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { PAYMENT_METHOD_LABELS } from '@/lib/reports';
import { useAdminTheme } from '@/hooks/useAdminTheme';

const PERIOD_OPTIONS: AnalyticsPeriod[] = ['day', 'week', 'month', 'year'];
const gridStyle = dashboardTokens.grid;

function formatPeriodRange(from: string, to: string): string {
  if (from === to) {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(`${from}T12:00:00`));
  }
  const fmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt.format(new Date(`${from}T12:00:00`))} – ${fmt.format(new Date(`${to}T12:00:00`))}`;
}

function KpiStatCard({
  label,
  metric,
  formatValue,
}: {
  label: string;
  metric: AnalyticsKpiMetric;
  formatValue?: (n: number) => string;
}) {
  const display = formatValue ? formatValue(metric.current) : String(metric.current);
  const arrow = metric.direction === 'up' ? '↑' : metric.direction === 'down' ? '↓' : '→';
  const hint =
    metric.changePercent !== null
      ? `${arrow} ${Math.abs(metric.changePercent)}% vs periode sebelumnya`
      : metric.current > 0
        ? 'Baru ada data pada periode ini'
        : 'Belum ada data';
  const accent =
    metric.direction === 'up' ? 'success' : metric.direction === 'down' ? 'error' : 'default';

  return <StatCard label={label} value={display} hint={hint} accent={accent} />;
}

function HorizontalBarChart({
  items,
  maxValue,
  formatValue,
}: {
  items: Array<{ label: string; value: number; sublabel?: string }>;
  maxValue: number;
  formatValue: (n: number) => string;
}) {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {items.map((item) => {
        const widthPercent = maxValue > 0 ? Math.max(4, Math.round((item.value / maxValue) * 100)) : 0;
        return (
          <div key={item.label}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                marginBottom: 4,
                gap: '0.5rem',
              }}
            >
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatValue(item.value)}</span>
            </div>
            {item.sublabel ? (
              <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: dashboardTokens.muted }}>{item.sublabel}</p>
            ) : null}
            <div style={{ height: 8, background: 'var(--admin-bar-track, #e2e8f0)', borderRadius: 999 }}>
              <div
                style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  background: dashboardTokens.primary,
                  borderRadius: 999,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TrendChart({ points }: { points: AnalyticsSummary['salesTrend'] }) {
  const maxRevenue = Math.max(...points.map((p) => p.revenue), 1);
  const hasData = points.some((p) => p.revenue > 0);

  if (!hasData) {
    return <p style={{ margin: 0, color: dashboardTokens.muted }}>Belum ada penjualan pada periode ini.</p>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 140, overflowX: 'auto', paddingBottom: 4 }}>
      {points.map((point) => {
        const heightPercent = Math.max(4, Math.round((point.revenue / maxRevenue) * 100));
        return (
          <div
            key={`${point.label}-${point.date ?? ''}`}
            title={`${point.label}: ${formatCurrencyIDR(point.revenue)} (${point.transactionCount} trx)`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: points.length > 20 ? 28 : 40,
              flex: points.length <= 12 ? 1 : '0 0 auto',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 36,
                height: `${heightPercent}%`,
                minHeight: point.revenue > 0 ? 8 : 2,
                background: point.revenue > 0 ? dashboardTokens.primary : '#e2e8f0',
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.2s ease',
              }}
            />
            <span
              style={{
                marginTop: 6,
                fontSize: '0.65rem',
                color: dashboardTokens.muted,
                writingMode: points.length > 14 ? 'vertical-rl' : undefined,
                maxHeight: points.length > 14 ? 48 : undefined,
                textAlign: 'center',
              }}
            >
              {point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const { tokens } = useAdminTheme();
  const [periodMode, setPeriodMode] = useState<'preset' | 'custom'>('preset');
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [anchorDate, setAnchorDate] = useState(() => getTodayDate());
  const [dateFrom, setDateFrom] = useState(() => getTodayDate());
  const [dateTo, setDateTo] = useState(() => getTodayDate());
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingWeekly, setExportingWeekly] = useState(false);

  const queryParams = useMemo(() => {
    const base = { outletId: selectedOutletId ?? undefined };
    if (periodMode === 'custom') {
      return { from: dateFrom, to: dateTo, ...base };
    }
    return { period, date: anchorDate || getTodayDate(), ...base };
  }, [anchorDate, dateFrom, dateTo, period, periodMode, selectedOutletId]);

  const load = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      setSummary(null);
      setError(null);
      return;
    }

    if (periodMode === 'custom' && (!dateFrom || !dateTo)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsSummary(queryParams);
      if (!data) {
        setError('Data analitik belum tersedia.');
        setSummary(null);
      } else {
        setSummary(data);
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat analitik.'));
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, periodMode, dateFrom, dateTo, queryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxPaymentAmount = Math.max(...(summary?.paymentMethods.map((p) => p.amount) ?? [0]), 1);

  async function handleExportCsv() {
    setExporting(true);
    setError(null);
    try {
      const result = await downloadAnalyticsMarginCsv({
        outletId: selectedOutletId ?? undefined,
        days: period === 'day' ? 7 : 30,
      });
      if (!result) {
        setError('Gagal mengekspor CSV analitik.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(result.blob);
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(mapApiError(err, 'Gagal mengekspor CSV analitik.'));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportWeeklyCsv() {
    setExportingWeekly(true);
    setError(null);
    try {
      const result = await downloadAnalyticsWeeklyCsv({
        outletId: selectedOutletId ?? undefined,
      });
      if (!result) {
        setError('Gagal mengekspor CSV minggu ini.');
        return;
      }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(result.blob);
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError(mapApiError(err, 'Gagal mengekspor CSV minggu ini.'));
    } finally {
      setExportingWeekly(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Analitik Penjualan"
        description="Ringkasan bisnis untuk keputusan cepat — penjualan, margin, produk terlaris, dan kesehatan keuangan."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analitik' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Memuat…' : 'Muat ulang'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExportWeeklyCsv()}
              disabled={loading || exportingWeekly}
            >
              {exportingWeekly ? 'Mengekspor…' : 'Export minggu ini'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleExportCsv()}
              disabled={loading || exporting}
            >
              {exporting ? 'Mengekspor…' : 'Ekspor CSV Margin'}
            </Button>
          </div>
        }
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">
          Pilih cabang di header untuk filter per outlet, atau biarkan kosong untuk agregat semua cabang.
        </AlertBanner>
      ) : null}

      <SectionCard title="Periode" description="Kalender WIB — default Hari ini.">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPeriodMode('preset');
                setPeriod(p);
              }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: 999,
                border: periodMode === 'preset' && period === p ? '1px solid #16a34a' : `1px solid ${tokens.cardBorder}`,
                background: periodMode === 'preset' && period === p ? '#f0fdf4' : tokens.cardBg,
                color: periodMode === 'preset' && period === p ? '#166534' : tokens.text,
                fontWeight: periodMode === 'preset' && period === p ? 600 : 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {ANALYTICS_PERIOD_LABELS[p]}
              {p === 'day' && periodMode === 'preset' && period === 'day' ? ' ★' : ''}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriodMode('custom')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 999,
              border: periodMode === 'custom' ? '1px solid #2563eb' : `1px solid ${tokens.cardBorder}`,
              background: periodMode === 'custom' ? '#eff6ff' : tokens.cardBg,
              color: periodMode === 'custom' ? '#1d4ed8' : tokens.text,
              fontWeight: periodMode === 'custom' ? 600 : 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Rentang custom
          </button>
        </div>

        {periodMode === 'preset' ? (
          <Input
            label="Tanggal acuan"
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
          />
        ) : (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Input label="Dari" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input label="Sampai" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        )}
      </SectionCard>

      {error ? (
        <AlertBanner variant="error" onRetry={() => void load()}>
          {error}
        </AlertBanner>
      ) : null}

      {loading ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <LoadingSkeleton rows={2} />
          <LoadingSkeleton rows={4} />
        </div>
      ) : summary ? (
        <>
          {summary.insights.length > 0 ? (
            <SectionCard title="Insight" description="Ringkasan otomatis untuk keputusan cepat.">
              <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.5rem' }}>
                {summary.insights.map((line) => (
                  <li key={line} style={{ fontSize: '0.9375rem', color: dashboardTokens.text }}>
                    {line}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}

          <section>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.125rem', color: tokens.text }}>
              Pulse bisnis
            </h3>
            <div style={gridStyle}>
              <KpiStatCard
                label="Penjualan bersih"
                metric={summary.pulse.netSales}
                formatValue={formatCurrencyIDR}
              />
              <KpiStatCard label="Jumlah transaksi" metric={summary.pulse.transactionCount} />
              <KpiStatCard
                label="Rata-rata struk"
                metric={summary.pulse.averageTicket}
                formatValue={formatCurrencyIDR}
              />
              <StatCard
                label="Laba kotor"
                value={`${formatCurrencyIDR(summary.pulse.grossProfit.current)} (${summary.pulse.grossProfitPercent}%)`}
                hint={
                  summary.pulse.grossProfit.changePercent !== null
                    ? `${summary.pulse.grossProfit.direction === 'up' ? '↑' : summary.pulse.grossProfit.direction === 'down' ? '↓' : '→'} ${Math.abs(summary.pulse.grossProfit.changePercent)}% vs periode sebelumnya`
                    : 'Estimasi dari HPP produk saat ini'
                }
                accent={
                  summary.pulse.grossProfit.direction === 'up'
                    ? 'success'
                    : summary.pulse.grossProfit.direction === 'down'
                      ? 'error'
                      : 'default'
                }
              />
            </div>
          </section>

          <SectionCard
            title="Tren penjualan"
            description={
              summary.period === 'year'
                ? 'Agregat bulanan dalam tahun kalender.'
                : summary.period === 'day'
                  ? 'Per jam (WIB) untuk hari ini.'
                  : 'Per hari dalam periode terpilih.'
            }
          >
            <TrendChart points={summary.salesTrend} />
          </SectionCard>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <SectionCard title="Top 10 produk" description="Berdasarkan omzet periode.">
              {summary.topProducts.length === 0 ? (
                <EmptyState
                  title="Belum ada penjualan"
                  description="Transaksi selesai akan muncul di sini."
                  actionHref="/master/products"
                  actionLabel="Kelola produk"
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem' }}>#</th>
                        <th style={{ padding: '0.5rem' }}>Produk</th>
                        <th style={{ padding: '0.5rem' }}>Qty</th>
                        <th style={{ padding: '0.5rem' }}>Omzet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.topProducts.map((row, index) => (
                        <tr key={row.productId} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                          <td style={{ padding: '0.65rem 0.5rem', color: tokens.muted }}>{index + 1}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{row.productName}</td>
                          <td style={{ padding: '0.65rem 0.5rem' }}>{row.quantity}</td>
                          <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>
                            {formatCurrencyIDR(row.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Metode pembayaran" description="Komposisi pembayaran transaksi selesai.">
              {summary.paymentMethods.length === 0 ? (
                <p style={{ margin: 0, color: tokens.muted }}>Belum ada pembayaran pada periode ini.</p>
              ) : (
                <HorizontalBarChart
                  items={summary.paymentMethods.map((row) => ({
                    label: PAYMENT_METHOD_LABELS[row.method] ?? row.method,
                    value: row.amount,
                    sublabel: `${row.count} trx · ${row.sharePercent}%`,
                  }))}
                  maxValue={maxPaymentAmount}
                  formatValue={formatCurrencyIDR}
                />
              )}
            </SectionCard>
          </div>

          {summary.outletPerformance && summary.outletPerformance.length > 0 ? (
            <SectionCard title="Performa cabang" description="Perbandingan omzet antar outlet (semua cabang).">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Cabang</th>
                      <th style={{ padding: '0.5rem' }}>Transaksi</th>
                      <th style={{ padding: '0.5rem' }}>Omzet</th>
                      <th style={{ padding: '0.5rem' }}>Laba kotor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.outletPerformance.map((row) => (
                      <tr key={row.outletId} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.outletName}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.transactionCount}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{formatCurrencyIDR(row.revenue)}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{formatCurrencyIDR(row.grossProfit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <SectionCard title="Piutang & utang" description="Snapshot posisi keuangan saat ini.">
              <div style={gridStyle}>
                <StatCard
                  label="Piutang outstanding"
                  value={formatCurrencyIDR(summary.financeSnapshot.receivablesOutstanding)}
                  hint={
                    summary.financeSnapshot.receivablesOverdueCount > 0
                      ? `${summary.financeSnapshot.receivablesOverdueCount} jatuh tempo`
                      : 'Tidak ada jatuh tempo'
                  }
                  accent={summary.financeSnapshot.receivablesOverdueCount > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  label="Utang outstanding"
                  value={formatCurrencyIDR(summary.financeSnapshot.payablesOutstanding)}
                  hint={
                    summary.financeSnapshot.payablesOverdueCount > 0
                      ? `${summary.financeSnapshot.payablesOverdueCount} jatuh tempo`
                      : 'Tidak ada jatuh tempo'
                  }
                  accent={summary.financeSnapshot.payablesOverdueCount > 0 ? 'warning' : 'default'}
                />
              </div>
              <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem' }}>
                <Link href="/dashboard/finance" style={{ color: '#2563eb' }}>
                  Buka hub Keuangan →
                </Link>
              </p>
            </SectionCard>

            <SectionCard title="Margin per kategori" description="Profitabilitas per kelompok produk.">
              {summary.marginByCategory.length === 0 ? (
                <p style={{ margin: 0, color: tokens.muted }}>Belum ada transaksi pada periode ini.</p>
              ) : (
                <HorizontalBarChart
                  items={summary.marginByCategory.slice(0, 8).map((row) => ({
                    label: row.categoryName,
                    value: row.revenue,
                    sublabel: `Margin ${row.marginPercent}% · ${row.quantity} unit`,
                  }))}
                  maxValue={summary.marginByCategory[0]?.revenue ?? 1}
                  formatValue={formatCurrencyIDR}
                />
              )}
            </SectionCard>
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>
            Periode: {formatPeriodRange(summary.dateFrom, summary.dateTo)} (WIB) · Dibandingkan dengan{' '}
            {formatPeriodRange(summary.previousDateFrom, summary.previousDateTo)} · HPP estimasi dari cost price
            produk saat ini.{' '}
            <Link href="/dashboard/transactions" style={{ color: '#2563eb' }}>
              Lihat transaksi
            </Link>
          </p>
        </>
      ) : !needsOutletPick ? (
        <EmptyState
          title="Data analitik tidak tersedia"
          description="Pastikan API berjalan dan Anda memiliki akses ke outlet ini."
          actionHref="/dashboard"
          actionLabel="Kembali ke dashboard"
        />
      ) : null}
    </div>
  );
}
