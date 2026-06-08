'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, RECEIVABLE_AGING_BUCKET_LABELS, type ReceivableAgingBucket } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  exportAgingCsv,
  fetchReceivableAging,
  type ReceivableAgingReport,
} from '@/lib/receivables-api';

const BUCKET_VARIANT: Record<ReceivableAgingBucket, 'success' | 'warning' | 'error' | 'neutral'> = {
  CURRENT: 'success',
  DAYS_0_30: 'warning',
  DAYS_31_60: 'warning',
  DAYS_61_90: 'error',
  DAYS_90_PLUS: 'error',
};

export default function ReceivableAgingPage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [report, setReport] = useState<ReceivableAgingReport | null>(null);
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReceivableAging({
        outletId: selectedOutletId ?? undefined,
        groupByCustomer,
      });
      setReport(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat laporan aging.'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, groupByCustomer]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Aging Piutang"
        description="Analisis piutang outstanding berdasarkan hari keterlambatan."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Piutang', href: '/dashboard/receivables' },
          { label: 'Aging' },
        ]}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
              {loading ? 'Memuat…' : 'Muat ulang'}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!report}
              onClick={() => report && exportAgingCsv(report)}
            >
              Ekspor CSV
            </Button>
          </>
        }
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header untuk filter aging per outlet.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <SectionCard title="Tampilan">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={groupByCustomer}
            onChange={(e) => setGroupByCustomer(e.target.checked)}
          />
          Kelompokkan per pelanggan
        </label>
      </SectionCard>

      {loading && !report ? <LoadingSkeleton rows={4} /> : null}

      {report ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <StatCard label="Total Outstanding" value={formatCurrencyIDR(report.totalOutstanding)} accent="warning" />
            {report.totals.map((t) => (
              <StatCard
                key={t.bucket}
                label={t.label}
                value={formatCurrencyIDR(t.amount)}
                hint={`${t.count} tagihan`}
                accent={BUCKET_VARIANT[t.bucket]}
              />
            ))}
          </div>

          <SectionCard title={groupByCustomer ? 'Per Pelanggan' : 'Detail Piutang'}>
            {groupByCustomer && report.byCustomer && report.byCustomer.length === 0 ? (
              <EmptyState title="Tidak ada piutang aktif" description="Semua tagihan sudah lunas." />
            ) : null}
            {!groupByCustomer && report.rows && report.rows.length === 0 ? (
              <EmptyState title="Tidak ada piutang aktif" description="Semua tagihan sudah lunas." />
            ) : null}

            {groupByCustomer && report.byCustomer && report.byCustomer.length > 0 ? (
              <DataTable>
                <table style={tableStyles.table}>
                  <thead>
                    <tr>
                      <th style={tableStyles.th}>Pelanggan</th>
                      <th style={tableStyles.th}>Total</th>
                      {report.totals.map((t) => (
                        <th key={t.bucket} style={tableStyles.th}>
                          {RECEIVABLE_AGING_BUCKET_LABELS[t.bucket]}
                        </th>
                      ))}
                      <th style={tableStyles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byCustomer.map((row) => (
                      <tr key={row.customerId}>
                        <td style={tableStyles.td}>
                          <div>{row.customerName}</div>
                          <small>{row.customerPhone}</small>
                        </td>
                        <td style={tableStyles.td}>{formatCurrencyIDR(row.totalOutstanding)}</td>
                        {row.buckets.map((b) => (
                          <td key={b.bucket} style={tableStyles.td}>
                            {b.amount > 0 ? formatCurrencyIDR(b.amount) : '—'}
                          </td>
                        ))}
                        <td style={tableStyles.td}>
                          <Link href={`/dashboard/receivables/statement/${row.customerId}`} style={{ color: '#2563eb' }}>
                            Statement
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            ) : null}

            {!groupByCustomer && report.rows && report.rows.length > 0 ? (
              <DataTable>
                <table style={tableStyles.table}>
                  <thead>
                    <tr>
                      <th style={tableStyles.th}>Pelanggan</th>
                      <th style={tableStyles.th}>Outlet</th>
                      <th style={tableStyles.th}>Sisa</th>
                      <th style={tableStyles.th}>Jatuh Tempo</th>
                      <th style={tableStyles.th}>Terlambat</th>
                      <th style={tableStyles.th}>Bucket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.receivableId}>
                        <td style={tableStyles.td}>
                          <div>{row.customerName}</div>
                          <small>{row.customerPhone}</small>
                        </td>
                        <td style={tableStyles.td}>{row.outletName ?? '—'}</td>
                        <td style={tableStyles.td}>{formatCurrencyIDR(row.outstanding)}</td>
                        <td style={tableStyles.td}>{row.dueDate ?? '—'}</td>
                        <td style={tableStyles.td}>{row.daysOverdue > 0 ? `${row.daysOverdue} hari` : '—'}</td>
                        <td style={tableStyles.td}>{RECEIVABLE_AGING_BUCKET_LABELS[row.bucket]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            ) : null}
          </SectionCard>

          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            Per tanggal {report.asOf}.{' '}
            <Link href="/dashboard/receivables" style={{ color: '#2563eb' }}>
              ← Kembali ke daftar piutang
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
