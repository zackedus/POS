'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  DEFAULT_PAGE_SIZE,
  PaymentMethod,
  SALE_DISPLAY_STATUS_LABELS,
  SALE_SOURCE_TYPE_LABELS,
  type PaginationMeta,
  type SalePurchaseListItem,
  type SaleSourceType,
  type SaleSourceTypeFilter,
} from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  TablePagination,
} from '@/components/dashboard/dashboard-ui';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { SaleSourceBadge, saleDisplayStatusVariant } from '@/components/dashboard/transactions/sale-badges';
import { TransactionDetailPanel } from '@/components/dashboard/transactions/TransactionDetailPanel';
import { VoidTransactionModal } from '@/components/pos/VoidTransactionModal';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { buildFilterChips, defaultDateFilters } from '@/lib/list-filters';
import { PAYMENT_METHOD_LABELS } from '@/lib/reports';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  fetchRecentTransactions,
  fetchTransactionReceipt,
  toRecentTransactionSummary,
  type ReceiptResponse,
} from '@/lib/transactions';

const SOURCE_TABS: Array<{ value: SaleSourceTypeFilter; label: string }> = [
  { value: 'ALL', label: 'Semua' },
  { value: 'TOKO', label: SALE_SOURCE_TYPE_LABELS.TOKO },
  { value: 'WEB', label: SALE_SOURCE_TYPE_LABELS.WEB },
  { value: 'MARKETPLACE', label: SALE_SOURCE_TYPE_LABELS.MARKETPLACE },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Semua metode' },
  { value: PaymentMethod.CASH, label: 'Tunai' },
  { value: PaymentMethod.TRANSFER, label: 'Transfer' },
  { value: PaymentMethod.QRIS, label: 'QRIS' },
  { value: PaymentMethod.E_WALLET, label: 'E-Wallet' },
  { value: PaymentMethod.CARD, label: 'Kartu' },
  { value: PaymentMethod.CREDIT, label: 'Tempo/Kredit' },
  { value: PaymentMethod.DEPOSIT, label: 'Deposit' },
  { value: 'COD', label: 'COD (Bayar di tempat)' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Semua status' },
  { value: 'COMPLETED', label: SALE_DISPLAY_STATUS_LABELS.COMPLETED },
  { value: 'IN_PROGRESS', label: SALE_DISPLAY_STATUS_LABELS.IN_PROGRESS },
  { value: 'VOID', label: SALE_DISPLAY_STATUS_LABELS.VOID },
  { value: 'REFUND', label: SALE_DISPLAY_STATUS_LABELS.REFUND },
  { value: 'PARTIAL', label: SALE_DISPLAY_STATUS_LABELS.PARTIAL },
];

const EMPTY_BY_TAB: Record<SaleSourceTypeFilter, { title: string; description: string }> = {
  ALL: {
    title: 'Belum ada pembelian',
    description: 'Transaksi penjualan hari ini akan muncul di sini. Sesuaikan filter tanggal jika perlu.',
  },
  TOKO: {
    title: 'Belum ada penjualan toko',
    description: 'Checkout dari kasir POS akan tampil di tab ini.',
  },
  WEB: {
    title: 'Belum ada order web',
    description: 'Pesanan web yang sudah dibayar akan muncul di sini.',
  },
  MARKETPLACE: {
    title: 'Belum ada order marketplace',
    description: 'Order Tokopedia/Shopee yang tercatat akan muncul di sini.',
  },
};

type PurchaseFilters = {
  outletId: string;
  sourceType: SaleSourceTypeFilter;
  status: 'ALL' | 'COMPLETED' | 'VOID' | 'REFUND' | 'PARTIAL' | 'IN_PROGRESS';
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

function createDefaultFilters(outletId = ''): PurchaseFilters {
  const dates = defaultDateFilters();
  return {
    outletId,
    sourceType: 'ALL',
    status: 'ALL',
    paymentMethod: '',
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    search: '',
  };
}

function sourceTabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '0.45rem 0.85rem',
    borderRadius: '999px',
    border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
    background: active ? '#eff6ff' : '#fff',
    color: active ? '#1d4ed8' : '#334155',
    fontWeight: active ? 600 : 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
  };
}

function formatShortDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    value,
  );
}

export default function DashboardTransactionsPage() {
  const searchParams = useSearchParams();
  const linkedTransactionId = searchParams.get('id');
  const linkedReceiptNo = searchParams.get('receiptNo');
  const { outlets, selectedOutletId, needsOutletPick } = useOutletSelection();
  const multiOutlet = outlets.length > 1;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<SalePurchaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptResponse | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<SalePurchaseListItem | null>(null);
  const [selectedRow, setSelectedRow] = useState<SalePurchaseListItem | null>(null);
  const [draftFilters, setDraftFilters] = useState<PurchaseFilters>(() =>
    createDefaultFilters(selectedOutletId ?? ''),
  );
  const [appliedFilters, setAppliedFilters] = useState<PurchaseFilters>(() =>
    createDefaultFilters(selectedOutletId ?? ''),
  );
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
          key: 'source',
          label: `Tipe: ${SOURCE_TABS.find((o) => o.value === appliedFilters.sourceType)?.label ?? appliedFilters.sourceType}`,
          active: appliedFilters.sourceType !== 'ALL',
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
      setItems([]);
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
        sourceType: appliedFilters.sourceType,
        status: appliedFilters.status,
        paymentMethod: appliedFilters.paymentMethod || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        search: appliedFilters.search || undefined,
      });
      setItems(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pembelian.');
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
    setDraftFilters({ ...defaults, sourceType: draftFilters.sourceType });
    setAppliedFilters({ ...defaults, sourceType: appliedFilters.sourceType });
    setPage(1);
  }

  function switchSourceTab(sourceType: SaleSourceTypeFilter) {
    setDraftFilters((prev) => ({ ...prev, sourceType }));
    setAppliedFilters((prev) => ({ ...prev, sourceType }));
    setPage(1);
    setSelectedRow(null);
    setReceiptPreview(null);
  }

  async function openReceipt(row: SalePurchaseListItem) {
    const txId = row.transactionId ?? row.id;
    if (row.recordType !== 'TRANSACTION') return;
    setLoadingReceiptId(txId);
    setError(null);
    try {
      const data = await fetchTransactionReceipt(txId);
      setReceiptPreview(data);
    } catch (err) {
      setReceiptPreview(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat struk.');
    } finally {
      setLoadingReceiptId(null);
    }
  }

  function openDetail(row: SalePurchaseListItem) {
    setSelectedRow(row);
    if (row.canReprint && row.recordType === 'TRANSACTION') {
      void openReceipt(row);
    } else {
      setReceiptPreview(null);
    }
  }

  useEffect(() => {
    if (items.length === 0) return;
    if (linkedTransactionId) {
      const match = items.find((row) => row.transactionId === linkedTransactionId || row.id === linkedTransactionId);
      if (match) openDetail(match);
      return;
    }
    if (linkedReceiptNo) {
      const match = items.find((row) => row.receiptNo === linkedReceiptNo);
      if (match) openDetail(match);
    }
  }, [linkedTransactionId, linkedReceiptNo, items]);

  const emptyState = EMPTY_BY_TAB[appliedFilters.sourceType];

  return (
    <div style={{ display: 'grid', gap: '1.25rem', maxWidth: 1200 }}>
      <PageHeader
        title="Daftar Pembelian"
        description="Kelola semua penjualan — toko POS, order web, dan marketplace. Void, cetak struk, dan pantau status dari satu tempat."
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
        dengan persetujuan manager. Order web dikelola di{' '}
        <Link href="/dashboard/online-orders" style={{ color: '#2563eb' }}>
          Pesanan Web
        </Link>
        .
      </AlertBanner>

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header sebelum melihat daftar pembelian.</AlertBanner>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} role="tablist" aria-label="Tipe pembelian">
        {SOURCE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={appliedFilters.sourceType === tab.value}
            style={sourceTabStyle(appliedFilters.sourceType === tab.value)}
            onClick={() => switchSourceTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
              setDraftFilters((prev) => ({ ...prev, status: value as PurchaseFilters['status'] })),
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
        searchPlaceholder="Cari no. struk / pelanggan…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {loading ? <LoadingSkeleton rows={6} /> : null}

      {!loading && items.length === 0 ? (
        <EmptyState
          title={emptyState.title}
          description={activeChips.length > 0 ? FILTER_EMPTY_DESCRIPTION : emptyState.description}
          actionHref="/pos"
          actionLabel="Buka Kasir"
        />
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>No. Struk</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tanggal</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tipe</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pelanggan</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Metode</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={`${row.recordType}-${row.id}`}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      background: selectedRow?.id === row.id && selectedRow.recordType === row.recordType ? '#f8fafc' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{row.receiptNo}</td>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{formatShortDate(row.completedAt)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <SaleSourceBadge sourceType={row.sourceType as SaleSourceType} label={row.sourceLabel} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{row.customerName ?? 'Walk-in'}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{formatIdr(row.total)}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
            {row.paymentMethodLabel ??
                        (row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : '—')}
                      {row.codPayment && !row.codPayment.balanceCollectedAt ? (
                        <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 2 }}>
                          Tagih saat terima: {formatIdr(row.codPayment.amountToCollect)}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge
                        label={row.displayStatusLabel}
                        variant={saleDisplayStatusVariant(row.displayStatus)}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <Button type="button" variant="ghost" onClick={() => openDetail(row)}>
                          Detail
                        </Button>
                        {row.canReprint ? (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={loadingReceiptId === (row.transactionId ?? row.id)}
                            onClick={() => {
                              openDetail(row);
                              void openReceipt(row);
                            }}
                          >
                            Struk
                          </Button>
                        ) : null}
                        {row.canVoid ? (
                          <Button type="button" variant="ghost" onClick={() => setVoidTarget(row)}>
                            Void
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {selectedRow ? (
        <TransactionDetailPanel
          row={selectedRow}
          receiptPreview={receiptPreview}
          loadingReceipt={loadingReceiptId === (selectedRow.transactionId ?? selectedRow.id)}
          onLoadReceipt={() => void openReceipt(selectedRow)}
          onClose={() => {
            setSelectedRow(null);
            setReceiptPreview(null);
          }}
          onVoid={
            selectedRow.canVoid
              ? () => setVoidTarget(selectedRow)
              : undefined
          }
        />
      ) : null}

      {voidTarget && user ? (
        <VoidTransactionModal
          transaction={toRecentTransactionSummary(voidTarget)}
          userRole={user.role}
          onClose={() => setVoidTarget(null)}
          onSuccess={(message) => {
            const voidedId = voidTarget.transactionId ?? voidTarget.id;
            setSuccess(message);
            setVoidTarget(null);
            void loadData();
            if (receiptPreview?.receipt.transactionId === voidedId) {
              void openReceipt(voidTarget);
            }
          }}
        />
      ) : null}
    </div>
  );
}
