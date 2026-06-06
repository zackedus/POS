'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
  StatCard,
} from '@/components/dashboard/dashboard-ui';
import { fetchAnalytics, type AnalyticsReport } from '@/lib/analytics-api';
import { mapApiError } from '@/lib/api-client';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { useAdminTheme } from '@/hooks/useAdminTheme';

function BarChart({
  items,
  maxValue,
  labelKey,
  valueKey,
}: {
  items: Array<Record<string, string | number>>;
  maxValue: number;
  labelKey: string;
  valueKey: string;
}) {
  return (
    <div style={{ display: 'grid', gap: '0.65rem' }}>
      {items.map((item) => {
        const value = Number(item[valueKey]);
        const widthPercent = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;
        return (
          <div key={String(item[labelKey])}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
              <span>{String(item[labelKey])}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrencyIDR(value)}</span>
            </div>
            <div style={{ height: 8, background: 'var(--admin-bar-track, #e2e8f0)', borderRadius: 999 }}>
              <div
                style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  background: '#16a34a',
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

export default function AnalyticsPage() {
  const { selectedOutletId } = useOutletSelection();
  const { tokens } = useAdminTheme();
  const [days, setDays] = useState<7 | 30>(7);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics({ outletId: selectedOutletId ?? undefined, days });
      if (!data) {
        setError('Data analitik belum tersedia.');
        setReport(null);
      } else {
        setReport(data);
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat analitik.'));
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxTrendRevenue = Math.max(...(report?.salesTrend.map((d) => d.revenue) ?? [0]));

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Analitik Penjualan"
        description="Margin per kategori, produk terlaris, dan tren omzet."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value) as 7 | 30)}
              aria-label="Periode analitik"
              style={{ padding: '0.45rem 0.65rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
            >
              <option value={7}>7 hari</option>
              <option value={30}>30 hari</option>
            </select>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 8,
                border: `1px solid ${tokens.cardBorder}`,
                background: tokens.cardBg,
                cursor: 'pointer',
              }}
            >
              Muat ulang
            </button>
          </div>
        }
      />

      {error ? <AlertBanner variant="error" onRetry={() => void load()}>{error}</AlertBanner> : null}

      {loading ? (
        <div style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          <LoadingSkeleton rows={5} />
        </div>
      ) : report ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <StatCard label="Omzet" value={formatCurrencyIDR(report.summary.revenue)} />
            <StatCard label="HPP (estimasi)" value={formatCurrencyIDR(report.summary.cost)} />
            <StatCard
              label="Margin"
              value={`${formatCurrencyIDR(report.summary.margin)} (${report.summary.marginPercent}%)`}
            />
            <StatCard label="Item terjual" value={String(report.summary.itemCount)} />
          </div>

          <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
            <h3 style={{ margin: '0 0 1rem', color: tokens.text }}>Margin per Kategori</h3>
            {report.marginByCategory.length === 0 ? (
              <p style={{ margin: 0, color: tokens.muted }}>Belum ada transaksi pada periode ini.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem' }}>Kategori</th>
                      <th style={{ padding: '0.5rem' }}>Omzet</th>
                      <th style={{ padding: '0.5rem' }}>Margin</th>
                      <th style={{ padding: '0.5rem' }}>%</th>
                      <th style={{ padding: '0.5rem' }}>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.marginByCategory.map((row) => (
                      <tr key={row.categoryId} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.categoryName}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{formatCurrencyIDR(row.revenue)}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{formatCurrencyIDR(row.margin)}</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.marginPercent}%</td>
                        <td style={{ padding: '0.65rem 0.5rem' }}>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
              <h3 style={{ margin: '0 0 1rem', color: tokens.text }}>Produk Terlaris</h3>
              <BarChart
                items={report.topProducts.map((p) => ({ label: p.productName, value: p.revenue }))}
                maxValue={report.topProducts[0]?.revenue ?? 0}
                labelKey="label"
                valueKey="value"
              />
            </section>
            <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
              <h3 style={{ margin: '0 0 1rem', color: tokens.text }}>Tren Omzet Harian</h3>
              {report.salesTrend.length === 0 ? (
                <p style={{ margin: 0, color: tokens.muted }}>Tidak ada data tren.</p>
              ) : (
                <BarChart
                  items={report.salesTrend.map((d) => ({ label: d.date, value: d.revenue }))}
                  maxValue={maxTrendRevenue}
                  labelKey="label"
                  valueKey="value"
                />
              )}
            </section>
          </div>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: tokens.muted }}>
            Periode: {report.dateFrom} — {report.dateTo} · HPP estimasi dari cost price produk saat ini.
          </p>
        </>
      ) : null}
    </div>
  );
}
