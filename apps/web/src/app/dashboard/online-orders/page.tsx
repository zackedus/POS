'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
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

export default function DashboardOnlineOrdersPage() {
  const { selectedOutletId } = useOutletSelection();
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchManagerOrders({
          outletId: selectedOutletId ?? undefined,
          status: status || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
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
    },
    [selectedOutletId, status, dateFrom, dateTo, search],
  );

  useEffect(() => {
    void loadOrders(1);
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

      <SectionCard title="Filter">
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.8125rem' }}>
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Input label="Dari tanggal" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth />
          <Input label="Sampai tanggal" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth />
          <Input
            label="Cari no. order / nama / HP"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="WEB-… atau Budi"
            fullWidth
          />
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <Button type="button" variant="secondary" onClick={() => void loadOrders(1)}>
            Terapkan filter
          </Button>
        </div>
      </SectionCard>

      {loading ? <LoadingSkeleton rows={5} /> : null}

      {!loading && orders.length === 0 ? (
        <EmptyState title="Tidak ada pesanan" description="Belum ada pesanan online untuk filter yang dipilih." icon="◎" />
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
            onPageChange={(page) => void loadOrders(page)}
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
