'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { mapApiError } from '@/lib/api-client';
import { buildFilterChips } from '@/lib/list-filters';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  exportAgingCsv,
  fetchReceivableAging,
  type ReceivableAgingReport,
} from '@/lib/receivables-api';

const BUCKET_VARIANT: Record<ReceivableAgingBucket, 'success' | 'warning' | 'error' | 'default'> = {
  CURRENT: 'success',
  DAYS_0_30: 'warning',
  DAYS_31_60: 'warning',
  DAYS_61_90: 'error',
  DAYS_90_PLUS: 'error',
};

export function ReceivableAgingPanel({ embedded = false }: { embedded?: boolean }) {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [report, setReport] = useState<ReceivableAgingReport | null>(null);
  const [groupByCustomer, setGroupByCustomer] = useState(false);
  const [draftBucket, setDraftBucket] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedBucket, setAppliedBucket] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bucketOptions = [
    { value: '', label: 'Semua bucket' },
    ...(Object.entries(RECEIVABLE_AGING_BUCKET_LABELS) as Array<[ReceivableAgingBucket, string]>).map(
      ([value, label]) => ({ value, label }),
    ),
  ];

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'bucket',
          label: `Bucket: ${RECEIVABLE_AGING_BUCKET_LABELS[appliedBucket as ReceivableAgingBucket] ?? appliedBucket}`,
          active: Boolean(appliedBucket),
        },
        {
          key: 'search',
          label: `Pelanggan: ${appliedSearch}`,
          active: Boolean(appliedSearch.trim()),
        },
      ]),
    [appliedBucket, appliedSearch],
  );

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
        bucket: appliedBucket || undefined,
        customerSearch: appliedSearch || undefined,
      });
      setReport(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat laporan aging.'));
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, groupByCustomer, appliedBucket, appliedSearch]);

  function applyFilters() {
    setAppliedBucket(draftBucket);
    setAppliedSearch(draftSearch);
  }

  function resetFilters() {
    setDraftBucket('');
    setDraftSearch('');
    setAppliedBucket('');
    setAppliedSearch('');
  }

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {!embedded ? (
        <PageHeader
          title="Aging Piutang"
          description="Analisis piutang outstanding berdasarkan hari keterlambatan."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Keuangan', href: '/dashboard/finance?tab=piutang' },
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
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
        </div>
      )}

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header untuk filter aging per outlet.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <ListFilterBar
        selects={[
          {
            id: 'bucket',
            label: 'Bucket aging',
            value: draftBucket,
            options: bucketOptions,
            onChange: setDraftBucket,
            minWidth: 180,
          },
        ]}
        showDateRange={false}
        search={draftSearch}
        searchPlaceholder="Cari nama / telepon pelanggan…"
        onSearchChange={setDraftSearch}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

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
              <EmptyState
                title="Tidak ada piutang aktif"
                description={activeChips.length > 0 ? FILTER_EMPTY_DESCRIPTION : 'Semua tagihan sudah lunas.'}
              />
            ) : null}
            {!groupByCustomer && report.rows && report.rows.length === 0 ? (
              <EmptyState
                title="Tidak ada piutang aktif"
                description={activeChips.length > 0 ? FILTER_EMPTY_DESCRIPTION : 'Semua tagihan sudah lunas.'}
              />
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
            <Link href="/dashboard/finance?tab=piutang" style={{ color: '#2563eb' }}>
              ← Kembali ke daftar piutang
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
