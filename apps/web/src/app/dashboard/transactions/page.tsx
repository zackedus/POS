'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  TablePagination,
  useClientPagination,
} from '@/components/dashboard/dashboard-ui';
import { ReceiptPanel } from '@/components/pos/ReceiptPanel';
import { VoidTransactionModal } from '@/components/pos/VoidTransactionModal';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  fetchRecentTransactions,
  fetchTransactionReceipt,
  type RecentTransactionSummary,
  type ReceiptResponse,
} from '@/lib/transactions';
import { printReceiptBrowser } from '@/lib/thermal-print';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardTransactionsPage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptResponse | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<RecentTransactionSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'COMPLETED' | 'VOID'>('ALL');
  const [filterSearch, setFilterSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const today = todayIsoDate();
    setDateFrom(today);
    setDateTo(today);
  }, []);

  const loadData = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      setRecentTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const profile = await fetchMe();
      setUser(profile);
      const rows = await fetchRecentTransactions({
        limit: 100,
        outletId: selectedOutletId ?? undefined,
        status: filterStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: filterSearch || undefined,
      });
      setRecentTransactions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.');
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, filterStatus, dateFrom, dateTo, filterSearch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const { page, totalPages, pageItems, setPage, totalItems, pageSize } = useClientPagination(recentTransactions, 10);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterSearch, dateFrom, dateTo, setPage]);

  async function openReceipt(transactionId: string) {
    setLoadingReceiptId(transactionId);
    setError(null);
    try {
      const data = await fetchTransactionReceipt(transactionId);
      setReceiptPreview(data);
      setExpandedId(transactionId);
    } catch (err) {
      setReceiptPreview(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat struk.');
    } finally {
      setLoadingReceiptId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 960 }}>
      <PageHeader
        title="Void & Struk Transaksi"
        description="Panel admin untuk void transaksi selesai, filter riwayat, dan pratinjau struk digital."
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Memuat…' : 'Muat ulang'}
          </Button>
        }
      />

      <AlertBanner variant="info">
        Kasir juga dapat void dari{' '}
        <Link href="/pos" style={{ color: '#2563eb' }}>
          layar POS
        </Link>{' '}
        dengan persetujuan manager.
      </AlertBanner>

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header sebelum melihat transaksi.</AlertBanner>
      ) : null}

      <section style={cardStyle()}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
            Status
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'COMPLETED' | 'VOID')}
              style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            >
              <option value="ALL">Semua</option>
              <option value="COMPLETED">Selesai</option>
              <option value="VOID">Void</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
            Dari tanggal
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
            Sampai tanggal
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem', flex: '1 1 180px' }}>
            Cari no. struk
            <input
              type="search"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="RCP-…"
              style={{ padding: '0.45rem 0.6rem', borderRadius: 8, border: '1px solid #e2e8f0', minWidth: 160 }}
            />
          </label>
        </div>
      </section>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && recentTransactions.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Transaksi selesai di outlet aktif akan muncul di sini. Sesuaikan filter tanggal jika perlu."
          actionHref="/pos"
          actionLabel="Buka Kasir"
        />
      ) : null}

      {!loading && recentTransactions.length > 0 ? (
        <>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {pageItems.map((trx) => (
              <div key={trx.id} style={cardStyle()}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <strong>{trx.receiptNo}</strong>{' '}
                    <StatusBadge
                      label={trx.status === 'VOID' ? 'Void' : 'Selesai'}
                      variant={trx.status === 'VOID' ? 'error' : 'success'}
                    />
                    <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.9375rem' }}>
                      {formatCurrency(trx.total)} · {trx.cashierName}
                      {trx.completedAt
                        ? ` · ${new Date(trx.completedAt).toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={loadingReceiptId === trx.id}
                      onClick={() => void openReceipt(trx.id)}
                    >
                      {loadingReceiptId === trx.id ? 'Memuat…' : expandedId === trx.id ? 'Sembunyikan' : 'Detail & Struk'}
                    </Button>
                    {trx.status === 'COMPLETED' ? (
                      <Button type="button" variant="secondary" onClick={() => setVoidTarget(trx)}>
                        Void
                      </Button>
                    ) : null}
                  </div>
                </div>
                {expandedId === trx.id && receiptPreview?.receipt.transactionId === trx.id ? (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                    <ReceiptPanel
                      receipt={receiptPreview.receipt}
                      escpos={receiptPreview.escpos}
                      onPrint={() => printReceiptBrowser('barokah-receipt-print')}
                      onClose={() => {
                        setExpandedId(null);
                        setReceiptPreview(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      ) : null}

      {voidTarget && user ? (
        <VoidTransactionModal
          transaction={voidTarget}
          userRole={user.role}
          onClose={() => setVoidTarget(null)}
          onSuccess={(message) => {
            const voidedId = voidTarget.id;
            setSuccess(message);
            setVoidTarget(null);
            void loadData();
            if (receiptPreview?.receipt.transactionId === voidedId) {
              void openReceipt(voidedId);
            }
          }}
        />
      ) : null}
    </div>
  );
}
