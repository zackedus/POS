'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput, Input } from '@barokah/ui';
import {
  AlertBanner,
  EmptyState,
  PageHeader,
  ReportDateFilters,
  SectionCard,
  StatCard,
} from '@/components/dashboard/dashboard-ui';
import {
  ShiftStatusBadge,
  ShiftTabs,
  parseShiftTab,
  shiftTabHref,
  type ShiftTabId,
} from '@/components/shifts/shifts-ui';
import { canAccessDashboard } from '@/lib/rbac';
import { toUserFacingError } from '@/lib/api';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  closeShift,
  fetchActiveShift,
  fetchClosePreview,
  fetchShiftHistory,
  forceCloseShift,
  openShift,
  type ShiftClosePreview,
  type ShiftHistoryItem,
  type ShiftSummary,
} from '@/lib/shifts-api';

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export function ShiftsPageClient({
  tab,
  action,
  outletIdFromQuery,
  embedded = false,
}: {
  tab?: string;
  action?: string;
  outletIdFromQuery?: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const activeTab = parseShiftTab(tab);
  const activeOutletId = selectedOutletId ?? outletIdFromQuery ?? undefined;

  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [preview, setPreview] = useState<ShiftClosePreview | null>(null);
  const [history, setHistory] = useState<ShiftHistoryItem[]>([]);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [historyDateFrom, setHistoryDateFrom] = useState(weekAgoIsoDate());
  const [historyDateTo, setHistoryDateTo] = useState(todayIsoDate());
  const [historyDateMode, setHistoryDateMode] = useState<'single' | 'range'>('range');
  const [historySingleDate, setHistorySingleDate] = useState(todayIsoDate());

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [forceCloseReason, setForceCloseReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictShift, setConflictShift] = useState<ShiftSummary | null>(null);
  const [closePanelOpen, setClosePanelOpen] = useState(action === 'close');
  const [closeResult, setCloseResult] = useState<ShiftSummary | null>(null);
  const [openSuccess, setOpenSuccess] = useState<ShiftSummary | null>(null);

  const canForceClose = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const receivableHref = user && canAccessDashboard(user.role) ? '/dashboard/finance?tab=piutang' : '/pos';
  const selectedOutletLabel = outlets.find((o) => o.id === activeOutletId)?.label;

  useEffect(() => {
    if (outletIdFromQuery) {
      setSelectedOutletId(outletIdFromQuery);
    }
  }, [outletIdFromQuery, setSelectedOutletId]);

  useEffect(() => {
    if (action === 'close') setClosePanelOpen(true);
  }, [action]);

  const reloadActive = useCallback(async () => {
    const shift = await fetchActiveShift(activeOutletId);
    setActiveShift(shift);
    if (shift?.id) {
      const previewData = await fetchClosePreview(shift.id, activeOutletId);
      setPreview(previewData);
    } else {
      setPreview(null);
    }
    return shift;
  }, [activeOutletId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setUser(me);
        await reloadActive();
      } catch (err) {
        if (!cancelled) {
          setError(toUserFacingError(err, 'Gagal memuat data shift.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadActive]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError(null);
    const dateFrom = historyDateMode === 'single' ? historySingleDate : historyDateFrom;
    const dateTo = historyDateMode === 'single' ? historySingleDate : historyDateTo;
    try {
      const result = await fetchShiftHistory({
        outletId: activeOutletId,
        dateFrom,
        dateTo,
        page: historyMeta.page,
        limit: 20,
      });
      setHistory(result.items);
      setHistoryMeta({
        page: result.meta.page,
        totalPages: result.meta.totalPages,
        total: result.meta.total,
      });
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal memuat riwayat shift.'));
    } finally {
      setHistoryLoading(false);
    }
  }, [activeOutletId, historyDateFrom, historyDateTo, historyDateMode, historySingleDate, historyMeta.page]);

  useEffect(() => {
    if (activeTab !== 'riwayat') return;
    void loadHistory();
  }, [activeTab, loadHistory]);

  const setTab = useCallback(
    (nextTab: ShiftTabId) => {
      router.push(shiftTabHref(nextTab, undefined, embedded ? '/dashboard/shifts' : '/shift'));
    },
    [router, embedded],
  );

  const parsedClosing = useMemo(() => {
    if (!closingCash.trim()) return null;
    try {
      return parseCurrencyInput(closingCash);
    } catch {
      return null;
    }
  }, [closingCash]);

  const projectedDifference =
    preview && parsedClosing != null ? parsedClosing - preview.expectedCash : null;

  async function handleOpenSubmit(e: FormEvent) {
    e.preventDefault();
    if (!openingCash.trim() || needsOutletPick) return;

    setSubmitting(true);
    setError(null);
    setConflictShift(null);
    setOpenSuccess(null);

    try {
      const result = await openShift(parseCurrencyInput(openingCash), activeOutletId);
      setOpenSuccess(result);
      setOpeningCash('');
      await reloadActive();
    } catch (err) {
      const message = toUserFacingError(err, 'Gagal membuka shift.');
      setError(message);
      if (message.includes('Shift aktif') || message.includes('shift aktif')) {
        try {
          const existing = await fetchActiveShift(activeOutletId);
          setConflictShift(existing);
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForceClose() {
    if (!conflictShift?.id || !canForceClose) return;

    setSubmitting(true);
    setError(null);
    try {
      await forceCloseShift(conflictShift.id, forceCloseReason);
      setConflictShift(null);
      setForceCloseReason('');
      await reloadActive();
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal force-close shift.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeShift?.id || !closingCash.trim()) return;

    const confirmed = window.confirm(
      'Yakin tutup shift sekarang? Pastikan uang fisik sudah dihitung dan selisih sudah dicatat.',
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const closed = await closeShift(activeShift.id, parseCurrencyInput(closingCash));
      setCloseResult(closed);
      setClosePanelOpen(false);
      setClosingCash('');
      setCloseNotes('');
      setActiveShift(null);
      setPreview(null);
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal menutup shift.'));
    } finally {
      setSubmitting(false);
    }
  }

  const breadcrumbs = embedded
    ? [{ label: 'Dashboard', href: '/dashboard' }, { label: 'Shift & Kas' }]
    : [{ label: 'Kasir', href: '/pos' }, { label: 'Shift & Kas' }];

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <p style={{ color: '#64748b' }} role="status">
          Memuat shift…
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Shift & Kas"
        description="Kelola buka/tutup shift, rekonsiliasi kas, dan riwayat penutupan — satu halaman terpadu."
        breadcrumbs={breadcrumbs}
        actions={
          activeShift ? (
            <Link href="/pos" style={{ textDecoration: 'none' }}>
              <Button type="button" variant="secondary">
                Ke Kasir
              </Button>
            </Link>
          ) : null
        }
      />

      <ShiftTabs activeTab={activeTab} onTabChange={setTab} />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {openSuccess ? (
        <AlertBanner variant="success">
          Shift berhasil dibuka · Saldo awal {formatCurrencyIDR(openSuccess.openingCash)}
        </AlertBanner>
      ) : null}

      {activeTab === 'aktif' ? (
        <>
          {closeResult ? (
            <SectionCard title="Shift ditutup">
              <div style={{ display: 'grid', gap: '0.35rem', fontSize: '0.9375rem' }}>
                <p style={{ margin: 0 }}>Saldo awal: {formatCurrencyIDR(closeResult.openingCash)}</p>
                <p style={{ margin: 0 }}>Kas diharapkan: {formatCurrencyIDR(closeResult.expectedCash ?? 0)}</p>
                <p style={{ margin: 0 }}>Kas fisik: {formatCurrencyIDR(closeResult.closingCash ?? 0)}</p>
                <p style={{ margin: 0, fontWeight: 600 }}>
                  Selisih: {formatCurrencyIDR(closeResult.difference ?? 0)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                <Button type="button" onClick={() => setCloseResult(null)}>
                  Buka shift baru
                </Button>
                <Link href="/pos" style={{ textDecoration: 'none' }}>
                  <Button type="button" variant="secondary">
                    Ke Kasir
                  </Button>
                </Link>
              </div>
            </SectionCard>
          ) : null}

          {!activeShift && !closeResult ? (
            <SectionCard title="Buka Shift">
              {outlets.length > 1 ? (
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 600 }}>Cabang</span>
                    <select
                      value={activeOutletId ?? ''}
                      onChange={(event) => setSelectedOutletId(event.target.value)}
                      disabled={submitting}
                      style={{ minHeight: 44, borderRadius: 8, padding: '0 0.5rem' }}
                    >
                      <option value="" disabled>
                        Pilih cabang…
                      </option>
                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={outlet.id}>
                          {outlet.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {needsOutletPick ? (
                    <p style={{ margin: '0.35rem 0 0', color: '#b45309', fontSize: '0.8125rem' }}>
                      Pilih cabang sebelum membuka shift.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <form onSubmit={handleOpenSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                <CurrencyInput
                  label="Saldo awal kas (IDR)"
                  value={openingCash}
                  onChange={setOpeningCash}
                  placeholder="200.000"
                  fullWidth
                  disabled={submitting}
                  style={{ minHeight: 48 }}
                />
                <Button
                  type="submit"
                  disabled={submitting || !openingCash.trim() || needsOutletPick}
                  style={{ minHeight: 48 }}
                >
                  {submitting ? 'Memproses…' : 'Buka Shift'}
                </Button>
              </form>
            </SectionCard>
          ) : null}

          {conflictShift ? (
            <SectionCard title="Konflik shift terdeteksi">
              <p style={{ margin: '0 0 0.5rem', color: '#92400e' }}>
                Masih ada shift aktif yang belum ditutup.
              </p>
              <p style={{ margin: '0 0 0.75rem', color: '#78350f', fontSize: '0.875rem' }}>
                Dibuka {formatDateTime(conflictShift.openedAt)}
              </p>
              {canForceClose ? (
                <div style={{ display: 'grid', gap: '0.625rem' }}>
                  <Input
                    label="Alasan force-close (opsional)"
                    value={forceCloseReason}
                    onChange={(event) => setForceCloseReason(event.target.value)}
                    placeholder="Shift kasir sebelumnya belum ditutup saat pergantian shift."
                    fullWidth
                    disabled={submitting}
                  />
                  <Button type="button" disabled={submitting} onClick={() => void handleForceClose()}>
                    {submitting ? 'Memproses…' : 'Force-close shift aktif'}
                  </Button>
                </div>
              ) : (
                <p style={{ margin: 0, color: '#78350f', fontSize: '0.875rem' }}>
                  Hubungi manager atau owner untuk menutup shift aktif ini.
                </p>
              )}
            </SectionCard>
          ) : null}

          {activeShift && !closeResult ? (
            <>
              <SectionCard title="Shift Aktif">
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <ShiftStatusBadge active />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Link href="/pos" style={{ textDecoration: 'none' }}>
                      <Button type="button" variant="secondary">
                        Ke Kasir
                      </Button>
                    </Link>
                    <Link href={receivableHref} style={{ textDecoration: 'none' }}>
                      <Button type="button" variant="ghost">
                        Terima Piutang
                      </Button>
                    </Link>
                    {!closePanelOpen ? (
                      <Button type="button" onClick={() => setClosePanelOpen(true)}>
                        Tutup Shift
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '0.5rem',
                    fontSize: '0.9375rem',
                    marginBottom: '1rem',
                  }}
                >
                  {selectedOutletLabel ? (
                    <p style={{ margin: 0 }}>
                      <strong>Cabang:</strong> {selectedOutletLabel}
                    </p>
                  ) : null}
                  <p style={{ margin: 0 }}>
                    <strong>Kasir:</strong> {user?.fullName ?? '—'}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Dibuka:</strong> {formatDateTime(activeShift.openedAt)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Saldo awal:</strong> {formatCurrencyIDR(activeShift.openingCash)}
                  </p>
                </div>

                {preview ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    }}
                  >
                    <StatCard label="Penjualan tunai" value={formatCurrencyIDR(preview.cashSales)} hint={`${preview.transactionCount} transaksi`} />
                    <StatCard label="Terima piutang (tunai)" value={formatCurrencyIDR(preview.arCashCollections)} accent="success" />
                    <StatCard label="Pengeluaran tunai" value={formatCurrencyIDR(preview.cashExpenses)} accent="warning" />
                    <StatCard label="Kas diharapkan" value={formatCurrencyIDR(preview.expectedCash)} accent="success" />
                  </div>
                ) : null}

                {preview?.heldCount && preview.heldCount > 0 ? (
                  <div style={{ marginTop: '0.75rem' }}>
                    <AlertBanner variant="warning">
                      {preview.heldWarning ?? `${preview.heldCount} hold masih aktif.`}
                    </AlertBanner>
                  </div>
                ) : null}
              </SectionCard>

              {closePanelOpen ? (
                <SectionCard title="Rekonsiliasi & Tutup Shift">
                  <form onSubmit={handleCloseSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
                    <div
                      style={{
                        display: 'grid',
                        gap: '0.35rem',
                        padding: '0.75rem',
                        borderRadius: 8,
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.875rem',
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        Kas diharapkan: <strong>{formatCurrencyIDR(preview?.expectedCash ?? 0)}</strong>
                      </p>
                      {projectedDifference != null ? (
                        <p
                          style={{
                            margin: 0,
                            color: projectedDifference === 0 ? '#166534' : '#b45309',
                            fontWeight: 600,
                          }}
                        >
                          Selisih preview: {formatCurrencyIDR(projectedDifference)}
                          {projectedDifference === 0 ? ' (pas)' : projectedDifference > 0 ? ' (lebih)' : ' (kurang)'}
                        </p>
                      ) : null}
                    </div>
                    <CurrencyInput
                      label="Saldo akhir kas fisik (IDR)"
                      value={closingCash}
                      onChange={setClosingCash}
                      placeholder="450.000"
                      fullWidth
                      disabled={submitting}
                    />
                    <Input
                      label="Catatan selisih (opsional)"
                      value={closeNotes}
                      onChange={(event) => setCloseNotes(event.target.value)}
                      placeholder="Contoh: kembalian ke pelanggan belum tercatat"
                      fullWidth
                      disabled={submitting}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Button type="submit" disabled={submitting || !closingCash.trim()}>
                        {submitting ? 'Memproses…' : 'Tutup Shift'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setClosePanelOpen(false)}>
                        Batal
                      </Button>
                    </div>
                  </form>
                </SectionCard>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {activeTab === 'riwayat' ? (
        <SectionCard title="Riwayat Shift">
          <ReportDateFilters
            mode={historyDateMode}
            onModeChange={setHistoryDateMode}
            singleDate={historySingleDate}
            onSingleDateChange={setHistorySingleDate}
            dateFrom={historyDateFrom}
            dateTo={historyDateTo}
            onDateFromChange={setHistoryDateFrom}
            onDateToChange={setHistoryDateTo}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <Button type="button" variant="secondary" disabled={historyLoading} onClick={() => void loadHistory()}>
              Terapkan filter
            </Button>
          </div>

          {historyLoading ? (
            <p style={{ color: '#64748b', marginTop: '1rem' }}>Memuat riwayat…</p>
          ) : history.length === 0 ? (
            <EmptyState
              title="Belum ada shift ditutup"
              description="Shift yang sudah ditutup dalam rentang tanggal ini akan muncul di sini."
              icon="◷"
            />
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Kasir</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Cabang</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Dibuka</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Ditutup</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Kas diharapkan</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Kas fisik</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Selisih</th>
                    <th style={{ padding: '0.625rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.625rem 0.5rem' }}>{row.cashierName}</td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>{row.outletLabel}</td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>{formatDateTime(row.openedAt)}</td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        {row.closedAt ? formatDateTime(row.closedAt) : '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>
                        {row.expectedCash != null ? formatCurrencyIDR(row.expectedCash) : '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem', fontVariantNumeric: 'tabular-nums' }}>
                        {row.closingCash != null ? formatCurrencyIDR(row.closingCash) : '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.625rem 0.5rem',
                          fontVariantNumeric: 'tabular-nums',
                          color:
                            row.difference == null
                              ? undefined
                              : row.difference === 0
                                ? '#166534'
                                : '#b45309',
                          fontWeight: row.difference != null && row.difference !== 0 ? 600 : 400,
                        }}
                      >
                        {row.difference != null ? formatCurrencyIDR(row.difference) : '—'}
                      </td>
                      <td style={{ padding: '0.625rem 0.5rem' }}>
                        <ShiftStatusBadge active={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {historyMeta.totalPages > 1 ? (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                disabled={historyMeta.page <= 1 || historyLoading}
                onClick={() => setHistoryMeta((m) => ({ ...m, page: m.page - 1 }))}
              >
                Sebelumnya
              </Button>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Halaman {historyMeta.page} / {historyMeta.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={historyMeta.page >= historyMeta.totalPages || historyLoading}
                onClick={() => setHistoryMeta((m) => ({ ...m, page: m.page + 1 }))}
              >
                Berikutnya
              </Button>
            </div>
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
