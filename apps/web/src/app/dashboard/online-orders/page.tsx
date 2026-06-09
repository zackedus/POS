'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, ONLINE_ORDER_CHANNEL_LABELS } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
  TablePagination,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { buildFilterChips, defaultDateFilters } from '@/lib/list-filters';
import { mapApiError } from '@/lib/api-client';
import {
  fetchManagerOrders,
  fetchOrderDetail,
  fetchShippingLabel,
  type FulfillmentOrder,
  type OrderDetail,
  type ShippingLabelData,
} from '@/lib/online-orders-api';
import { ShippingLabelPrint, printShippingLabel } from '@/components/pos/ShippingLabelPrint';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua status' },
  { value: 'PENDING_PAYMENT', label: 'Menunggu bayar' },
  { value: 'PAID', label: 'Dibayar' },
  { value: 'CONFIRMED', label: 'Dikonfirmasi' },
  { value: 'READY', label: 'Siap' },
  { value: 'COMPLETED', label: 'Selesai' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
  { value: 'EXPIRED', label: 'Kedaluwarsa' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'Semua channel' },
  { value: 'WEB', label: ONLINE_ORDER_CHANNEL_LABELS.WEB },
  { value: 'TOKOPEDIA', label: ONLINE_ORDER_CHANNEL_LABELS.TOKOPEDIA },
  { value: 'SHOPEE', label: ONLINE_ORDER_CHANNEL_LABELS.SHOPEE },
  { value: 'OTHER', label: ONLINE_ORDER_CHANNEL_LABELS.OTHER },
];

type OrderFilters = {
  status: string;
  channel: string;
  dateFrom: string;
  dateTo: string;
  search: string;
};

function createDefaultOrderFilters(): OrderFilters {
  const dates = defaultDateFilters();
  return { status: '', channel: '', dateFrom: dates.dateFrom, dateTo: dates.dateTo, search: '' };
}

export default function DashboardOnlineOrdersPage() {
  const { selectedOutletId } = useOutletSelection();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [draftFilters, setDraftFilters] = useState<OrderFilters>(createDefaultOrderFilters);
  const [appliedFilters, setAppliedFilters] = useState<OrderFilters>(createDefaultOrderFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'status',
          label: `Status: ${STATUS_OPTIONS.find((o) => o.value === appliedFilters.status)?.label ?? appliedFilters.status}`,
          active: Boolean(appliedFilters.status),
        },
        {
          key: 'channel',
          label: `Channel: ${CHANNEL_OPTIONS.find((o) => o.value === appliedFilters.channel)?.label ?? appliedFilters.channel}`,
          active: Boolean(appliedFilters.channel),
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
    [appliedFilters],
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchManagerOrders({
        outletId: selectedOutletId ?? undefined,
        channel: appliedFilters.channel || undefined,
        status: appliedFilters.status || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
        search: appliedFilters.search || undefined,
        page,
        limit: 20,
      });
      setOrders(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pesanan online.'));
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId, appliedFilters, page]);

  function applyFilters() {
    setAppliedFilters({ ...draftFilters });
    setPage(1);
  }

  function resetFilters() {
    const defaults = createDefaultOrderFilters();
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
  }

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function openDetail(orderId: string) {
    setSelectedId(orderId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchOrderDetail(orderId, selectedOutletId ?? undefined);
      setDetail(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat detail pesanan.'));
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handlePrintLabel(orderId: string) {
    setPrintingLabel(true);
    try {
      const data = await fetchShippingLabel(orderId, selectedOutletId ?? undefined);
      setLabelData(data);
      window.setTimeout(() => printShippingLabel(), 150);
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyiapkan label pengiriman.'));
    } finally {
      setPrintingLabel(false);
    }
  }

  function statusVariant(statusCode: string): 'success' | 'warning' | 'error' | 'neutral' {
    if (statusCode === 'COMPLETED' || statusCode === 'PAID') return 'success';
    if (statusCode === 'CANCELLED' || statusCode === 'EXPIRED') return 'error';
    if (statusCode === 'PENDING_PAYMENT') return 'warning';
    return 'neutral';
  }

  return (
    <div>
      <PageHeader
        title="Pesanan Online"
        description="Kelola semua pesanan web toko — filter status, tanggal, dan lacak fulfillment."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pesanan Online' }]}
        actions={
          <Link href="/pos/online-orders" style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary">
              Antrian kasir
            </Button>
          </Link>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <ListFilterBar
        selects={[
          {
            id: 'status',
            label: 'Status',
            value: draftFilters.status,
            options: STATUS_OPTIONS,
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, status: value })),
          },
          {
            id: 'channel',
            label: 'Channel',
            value: draftFilters.channel,
            options: CHANNEL_OPTIONS,
            onChange: (value) => setDraftFilters((prev) => ({ ...prev, channel: value })),
          },
        ]}
        dateFrom={draftFilters.dateFrom}
        dateTo={draftFilters.dateTo}
        onDateFromChange={(value) => setDraftFilters((prev) => ({ ...prev, dateFrom: value }))}
        onDateToChange={(value) => setDraftFilters((prev) => ({ ...prev, dateTo: value }))}
        search={draftFilters.search}
        searchPlaceholder="No. order / nama / HP…"
        onSearchChange={(value) => setDraftFilters((prev) => ({ ...prev, search: value }))}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && orders.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan"
          description={activeChips.length > 0 ? FILTER_EMPTY_DESCRIPTION : 'Belum ada pesanan online untuk filter yang dipilih.'}
          icon="◎"
        />
      ) : null}

      {!loading && orders.length > 0 ? (
        <>
          <DataTable>
            <thead>
              <tr>
                <th style={tableStyles.th}>No. Order</th>
                <th style={tableStyles.th}>Pelanggan</th>
                <th style={tableStyles.th}>Status</th>
                <th style={tableStyles.th}>Total</th>
                <th style={tableStyles.th}>Tanggal</th>
                <th style={tableStyles.th}></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} style={tableStyles.row}>
                  <td style={tableStyles.td}>{order.orderNo}</td>
                  <td style={tableStyles.td}>
                    {order.customerName}
                    <br />
                    <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>{order.customerPhone}</span>
                  </td>
                  <td style={tableStyles.td}>
                    <StatusBadge label={order.statusLabel} variant={statusVariant(order.status)} />
                  </td>
                  <td style={tableStyles.td}>{formatCurrency(order.total)}</td>
                  <td style={tableStyles.td}>{new Date(order.createdAt).toLocaleString('id-ID')}</td>
                  <td style={tableStyles.td}>
                    <Button type="button" variant="ghost" onClick={() => void openDetail(order.id)}>
                      Detail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <TablePagination
            page={meta.page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            pageSize={meta.limit}
            onPageChange={setPage}
          />
        </>
      ) : null}

      {selectedId ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 50,
          }}
          role="dialog"
          aria-modal="true"
        >
          <SectionCard
            title={detail ? `Detail ${detail.orderNo}` : 'Memuat detail…'}
            style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}
          >
            {detailLoading ? <p style={{ color: '#64748b' }}>Memuat…</p> : null}
            {detail ? (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <p style={{ margin: 0 }}>
                  <StatusBadge label={detail.statusLabel} variant={statusVariant(detail.status)} />
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  {detail.customerName} · {detail.customerPhone}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                  {detail.fulfillmentType === 'DELIVERY' ? '🚚 Antar' : '📍 Pickup'} · {detail.outlet.name}
                </p>
                {detail.deliveryAddressFull ? (
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                    Alamat: {detail.deliveryAddressFull}
                  </p>
                ) : null}
                {detail.delivery ? (
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>
                    Pengiriman {detail.delivery.deliveryNo} · {detail.delivery.statusLabel}
                  </p>
                ) : null}
                {detail.customerNotes ? (
                  <p style={{ margin: 0, fontSize: '0.875rem' }}>Catatan: {detail.customerNotes}</p>
                ) : null}
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                  {detail.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.productName} — {formatCurrency(item.subtotal)}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 0, fontWeight: 700 }}>Total: {formatCurrency(detail.total)}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <Link href="/pos/online-orders" style={{ textDecoration: 'none' }}>
                    <Button type="button">Ke antrian fulfillment</Button>
                  </Link>
                  {detail.fulfillmentType === 'DELIVERY' ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={printingLabel}
                      onClick={() => void handlePrintLabel(detail.id)}
                    >
                      {printingLabel ? 'Menyiapkan…' : 'Cetak Label'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div style={{ marginTop: '1rem' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedId(null);
                  setDetail(null);
                }}
              >
                Tutup
              </Button>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {labelData ? (
        <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <ShippingLabelPrint data={labelData} />
        </div>
      ) : null}
    </div>
  );
}
