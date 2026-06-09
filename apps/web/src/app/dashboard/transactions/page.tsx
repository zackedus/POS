'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, DEFAULT_PAGE_SIZE, PaymentMethod, type PaginationMeta } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  TablePagination,
} from '@/components/dashboard/dashboard-ui';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { ReceiptPanel } from '@/components/pos/ReceiptPanel';
import { VoidTransactionModal } from '@/components/pos/VoidTransactionModal';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { buildFilterChips, defaultDateFilters } from '@/lib/list-filters';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  fetchRecentTransactions,
  fetchTransactionReceipt,
  type RecentTransactionSummary,
  type ReceiptResponse,
} from '@/lib/transactions';
import { printReceiptBrowser } from '@/lib/thermal-print';

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Semua metode' },
  { value: PaymentMethod.CASH, label: 'Tunai' },
  { value: PaymentMethod.TRANSFER, label: 'Transfer' },
  { value: PaymentMethod.QRIS, label: 'QRIS' },
  { value: PaymentMethod.E_WALLET, label: 'E-Wallet' },
  { value: PaymentMethod.CARD, label: 'Kartu' },
  { value: PaymentMethod.CREDIT, label: 'Tempo/Kredit' },
  { value: PaymentMethod.DEPOSIT, label: 'Deposit' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'VOID', label: 'Void' },
];

type TransactionFilters = {
  outletId: string;
  status: 'ALL' | 'COMPLETED' | 'VOID';
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

function createDefaultFilters(outletId = ''): TransactionFilters {
  const dates = defaultDateFilters();
  return {
    outletId,
    status: 'ALL',
    paymentMethod: '',
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    search: '',
  };
}

export default function DashboardTransactionsPage() {
  const searchParams = useSearchParams();
  const linkedTransactionId = searchParams.get('id');
  const { outlets, selectedOutletId, needsOutletPick } = useOutletSelection();
  const multiOutlet = outlets.length > 1;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransactionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptResponse | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<RecentTransactionSummary | null>(null);
  const [draftFilters, setDraftFilters] = useState<TransactionFilters>(() =>
    createDefaultFilters(selectedOutletId ?? ''),
  );
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>(() =>
    createDefaultFilters(selectedOutletId ?? ''),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });

  const queryOutletId = useMemo(() => {
    if (needsOutletPick) return undefined;
    if (multiOutlet) {
      return appliedFilters.outletId || undefined;
    }
    return selectedOutletId ?? undefined;
  }, [needsOutletPick, multiOutlet, appliedFilters.outletId, selectedOutletId]);

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'outlet',
          label: `Cabang: ${outlets.find((o) => o.id === appliedFilters.outletId)?.label ?? 'Semua'}`,
          active: multiOutlet && Boolean(appliedFilters.outletId),
        },
        {
          key: 'status',
          label: `Status: ${STATUS_OPTIONS.find((o) => o.value === appliedFilters.status)?.label ?? appliedFilters.status}`,
          active: appliedFilters.status !== 'ALL',
        },
        {
          key: 'payment',
          label: `Bayar: ${PAYMENT_METHOD_OPTIONS.find((o) => o.value === appliedFilters.paymentMethod)?.label ?? appliedFilters.paymentMethod}`,
          active: Boolean(appliedFilters.paymentMethod),
        },
        {
          key: 'date',
          label: `Tanggal: ${appliedFilters.dateFrom} – ${appliedFilters.dateTo}`,
          active:
            appliedFilters.dateFrom !== defaultDateFilters().dateFrom ||
            appliedFilters.dateTo !== defaultDateFilters().dateTo,
        },
        {
          key: 'search',
          label: `Cari: ${appliedFilters.search}`,
          active: Boolean(appliedFilters.search.trim()),
        },
      ]),
    [appliedFilters, multiOutlet, outlets],
  );

  const loadData = useCallback(async () => {
    if (needsOutletPick && !multiOutlet) {
      setLoading(false);
      setRecentTransactions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const profile = await fetchMe();
      setUser(profile);
      const result = await fetchRecentTransactions({
        page,
        limit: pageSize,
        outletId: queryOutletId,
        status: appliedFilters.status,
        paymentMethod: appliedFilters.paymentMethod || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        search: appliedFilters.search || undefined,
      });
      setRecentTransactions(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat transaksi.');
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, multiOutlet, queryOutletId, appliedFilters, page, pageSize]);

  useEffect(() => {
    if (!multiOutlet && selectedOutletId) {
      setDraftFilters((prev) => ({ ...prev, outletId: selectedOutletId }));
      setAppliedFilters((prev) => ({ ...prev, outletId: selectedOutletId }));
    }
  }, [multiOutlet, selectedOutletId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }

  function resetFilters() {
    const defaults = createDefaultFilters(multiOutlet ? '' : (selectedOutletId ?? ''));
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
  }

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

  useEffect(() => {
    if (!linkedTransactionId || recentTransactions.length === 0) {
      return;
    }
    const match = recentTransactions.find((row) => row.id === linkedTransactionId);
    if (match && expandedId !== match.id) {
      void openReceipt(match.id);
    }
  }, [linkedTransactionId, recentTransactions, expandedId]);

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

      <ListFilterBar
        selects={[
          ...(multiOutlet
            ? [
                {
                  id: 'outlet',
                  label: 'Cabang',
                  value: draftFilters.outletId,
                  options: [
                    { value: '', label: 'Semua cabang' },
                    ...outlets.map((outlet) => ({ value: outlet.id, label: outlet.label })),
                  ],
                  onChange: (value: string) => setDraftFilters((prev) => ({ ...prev, outletId: value })),
                  minWidth: 200,
                },
              ]
            : []),
          {
            id: 'status',
            label: 'Status',
            value: draftFilters.status,
            options: STATUS_OPTIONS,
            onChange: (value) =>
              setDraftFilters((prev) => ({ ...prev, status: value as TransactionFilters['status'] })),
          },
          {
            id: 'paymentMethod',
            label: 'Metode bayar',
            value: draftFilters.paymentMethod,
            options: PAYMENT_METHOD_OPTIONS,
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, paymentMethod: value })),
            minWidth: 180,
          },
        ]}
        dateFrom={draftFilters.dateFrom}
        dateTo={draftFilters.dateTo}
        onDateFromChange={(value) => setDraftFilters((prev) => ({ ...prev, dateFrom: value }))}
        onDateToChange={(value) => setDraftFilters((prev) => ({ ...prev, dateTo: value }))}
        search={draftFilters.search}
        searchPlaceholder="Cari no. struk…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && recentTransactions.length === 0 ? (
        <EmptyState
          title="Belum ada transaksi"
          description={
            activeChips.length > 0
              ? FILTER_EMPTY_DESCRIPTION
              : 'Transaksi selesai di outlet aktif akan muncul di sini. Sesuaikan filter tanggal jika perlu.'
          }
          actionHref="/pos"
          actionLabel="Buka Kasir"
        />
      ) : null}

      {!loading && recentTransactions.length > 0 ? (
        <>
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {recentTransactions.map((trx) => (
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
            page={meta.page}
            totalPages={meta.totalPages ?? 1}
            totalItems={meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
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
