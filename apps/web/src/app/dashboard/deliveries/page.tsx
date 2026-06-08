'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DELIVERIES_POLL_MS } from '@/hooks/useDeliveryBadge';
import Link from 'next/link';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_TYPE_LABELS,
  formatCurrencyIDR,
  ONLINE_ORDER_CHANNEL_BADGE,
  type OnlineOrderChannel,
} from '@barokah/shared';
import type { DeliveryOrderDetail, DeliveryOrderListItem, DeliveryStatus, DeliveryType } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import {
  AlertBanner,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
  TablePagination,
} from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import {
  fetchDeliveries,
  fetchDeliveryDetail,
  updateDeliveryStatus,
  type PaginatedDeliveries,
} from '@/lib/deliveries-api';
import { fetchShippingLabel, type ShippingLabelData } from '@/lib/online-orders-api';
import { ShippingLabelPrint, printShippingLabel } from '@/components/pos/ShippingLabelPrint';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const STATUS_TABS: Array<{ value: DeliveryStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Semua aktif' },
  { value: 'MENUNGGU', label: DELIVERY_STATUS_LABELS.MENUNGGU },
  { value: 'DISIAPKAN', label: DELIVERY_STATUS_LABELS.DISIAPKAN },
  { value: 'DIKIRIM', label: DELIVERY_STATUS_LABELS.DIKIRIM },
  { value: 'SELESAI', label: DELIVERY_STATUS_LABELS.SELESAI },
  { value: 'BATAL', label: DELIVERY_STATUS_LABELS.BATAL },
];

const TYPE_TABS: Array<{ value: DeliveryType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Semua tipe' },
  { value: 'STORE_DIRECT', label: DELIVERY_TYPE_LABELS.STORE_DIRECT },
  { value: 'ONLINE_ORDER', label: DELIVERY_TYPE_LABELS.ONLINE_ORDER },
];

function statusVariant(status: DeliveryStatus): 'neutral' | 'warning' | 'success' | 'error' {
  if (status === 'SELESAI') return 'success';
  if (status === 'BATAL') return 'error';
  if (status === 'MENUNGGU') return 'warning';
  return 'neutral';
}

export default function DashboardDeliveriesPage() {
  const { outlets, selectedOutletId } = useOutletSelection();
  const multiOutlet = outlets.length > 1;
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [typeTab, setTypeTab] = useState<DeliveryType | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<DeliveryOrderListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedDeliveries['meta']>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeliveryOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  const statusFilter = useMemo(() => {
    if (activeTab === 'ALL') return 'MENUNGGU,DISIAPKAN,DIKIRIM';
    return activeTab;
  }, [activeTab]);

  const queryOutletId = useMemo(() => {
    if (outletFilter === 'ALL') return undefined;
    return outletFilter;
  }, [outletFilter]);

  const detailOutletId = queryOutletId ?? selectedOutletId ?? undefined;

  useEffect(() => {
    if (!multiOutlet && selectedOutletId) {
      setOutletFilter(selectedOutletId);
    }
  }, [multiOutlet, selectedOutletId]);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDeliveries({
          outletId: queryOutletId,
          deliveryType: typeTab === 'ALL' ? undefined : typeTab,
          status: statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
          page,
          limit: 20,
        });
        setOrders(result.items);
        setMeta(result.meta);
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat antrian pengiriman.'));
      } finally {
        setLoading(false);
      }
    },
    [queryOutletId, statusFilter, typeTab, dateFrom, dateTo, search],
  );

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setError(null);
      try {
        const data = await fetchDeliveryDetail(id, detailOutletId);
        setDetail(data);
        setDriverName(data.driverName ?? '');
      } catch (err) {
        setDetail(null);
        setError(mapApiError(err, 'Gagal memuat detail pengiriman.'));
      } finally {
        setDetailLoading(false);
      }
    },
    [detailOutletId],
  );

  useEffect(() => {
    void loadOrders(1);
  }, [loadOrders]);

  useEffect(() => {
    const onDeliveryCreated = () => {
      void loadOrders(meta.page);
    };
    window.addEventListener('barokah:delivery-created', onDeliveryCreated);
    const timer = window.setInterval(() => {
      void loadOrders(meta.page);
    }, DELIVERIES_POLL_MS);
    return () => {
      window.removeEventListener('barokah:delivery-created', onDeliveryCreated);
      window.clearInterval(timer);
    };
  }, [loadOrders, meta.page]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleAdvance(order: DeliveryOrderListItem, nextStatus: DeliveryStatus) {
    setActionLoading(true);
    setError(null);
    try {
      if (nextStatus === 'BATAL' && !cancelReason.trim()) {
        setError('Alasan pembatalan wajib diisi.');
        return;
      }
      await updateDeliveryStatus(
        order.id,
        {
          status: nextStatus,
          driverName: driverName.trim() || undefined,
          cancelReason: nextStatus === 'BATAL' ? cancelReason.trim() : undefined,
        },
        detailOutletId,
      );
      setCancelReason('');
      await loadOrders(meta.page);
      if (selectedId === order.id) {
        await loadDetail(order.id);
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui status pengiriman.'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePrintLabel(onlineOrderId: string) {
    setPrintingLabel(true);
    try {
      const data = await fetchShippingLabel(onlineOrderId, detailOutletId);
      setLabelData(data);
      window.setTimeout(() => printShippingLabel(), 150);
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyiapkan label pengiriman.'));
    } finally {
      setPrintingLabel(false);
    }
  }

  const activeOrder = detail ?? orders.find((row) => row.id === selectedId) ?? null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title="Antrian Pengiriman"
        description="Kelola pengiriman toko langsung (POS) dan order online ke alamat pelanggan."
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <SectionCard title="Filter">
        {multiOutlet ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Cabang</label>
            <select
              value={outletFilter}
              onChange={(event) => setOutletFilter(event.target.value)}
              aria-label="Filter cabang pengiriman"
              style={{
                minHeight: 44,
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                minWidth: 200,
              }}
            >
              <option value="ALL">Semua cabang</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {TYPE_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant={typeTab === tab.value ? 'primary' : 'secondary'}
              onClick={() => setTypeTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant={activeTab === tab.value ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Input
            placeholder="Cari no. pengiriman / pelanggan / alamat"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="button" onClick={() => void loadOrders(1)}>
            Terapkan
          </Button>
        </div>
      </SectionCard>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: selectedId ? 'minmax(0, 1fr) minmax(280px, 360px)' : '1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            title="Belum ada pengiriman"
            description={
              multiOutlet && outletFilter !== 'ALL'
                ? 'Tidak ada pengiriman aktif untuk cabang ini. Coba filter Semua cabang atau pastikan cabang sesuai kasir POS.'
                : 'Pengiriman dari POS akan muncul di sini. Tab Semua aktif menampilkan Menunggu, Disiapkan, dan Dikirim.'
            }
          />
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {orders.map((order) => {
              const nextStatuses = DELIVERY_STATUS_TRANSITIONS[order.status] ?? [];
              const isSelected = selectedId === order.id;
              return (
                <SectionCard key={order.id} title={`${order.deliveryNo} · ${order.customer.name}`}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <StatusBadge label={order.statusLabel} variant={statusVariant(order.status)} />
                      <StatusBadge label={order.deliveryTypeLabel} variant="neutral" />
                      {multiOutlet ? (
                        <span style={{ color: '#64748b', fontSize: 13 }}>{order.outlet.name}</span>
                      ) : null}
                      <span style={{ color: '#64748b', fontSize: 13 }}>
                        {new Date(order.createdAt).toLocaleString('id-ID')}
                      </span>
                      {order.transaction ? (
                        <Link href={`/dashboard/transactions?id=${order.transaction.id}`}>
                          Struk {order.transaction.receiptNo}
                        </Link>
                      ) : null}
                      {order.onlineOrder ? (
                        <>
                          {order.onlineOrder.channelLabel ? (
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background:
                                  ONLINE_ORDER_CHANNEL_BADGE[order.onlineOrder.channel as OnlineOrderChannel]?.bg ??
                                  '#f1f5f9',
                                color:
                                  ONLINE_ORDER_CHANNEL_BADGE[order.onlineOrder.channel as OnlineOrderChannel]?.color ??
                                  '#334155',
                              }}
                            >
                              {order.onlineOrder.channelLabel}
                            </span>
                          ) : null}
                          <Link href={`/dashboard/online-orders`}>Order {order.onlineOrder.orderNo}</Link>
                        </>
                      ) : null}
                    </div>
                    <p style={{ margin: 0 }}>{order.addressSnippet}</p>
                    <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
                      {order.customer.phone}
                      {order.itemCount > 0 ? ` · ${order.itemCount} item` : ''}
                      {order.driverName ? ` · Driver: ${order.driverName}` : ''}
                    </p>
                    {order.notes ? (
                      <p style={{ margin: 0, fontSize: 13, color: '#334155' }}>Catatan: {order.notes}</p>
                    ) : null}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <Button
                        type="button"
                        variant={isSelected ? 'primary' : 'secondary'}
                        onClick={() => setSelectedId(isSelected ? null : order.id)}
                      >
                        {isSelected ? 'Tutup detail' : 'Detail'}
                      </Button>
                      {nextStatuses
                        .filter((status) => status !== 'BATAL')
                        .map((status) => (
                          <Button
                            key={status}
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleAdvance(order, status)}
                            style={{ minHeight: 44 }}
                          >
                            → {DELIVERY_STATUS_LABELS[status]}
                          </Button>
                        ))}
                    </div>

                  </div>
                </SectionCard>
              );
            })}
            <TablePagination
              page={meta.page}
              totalPages={meta.totalPages}
              totalItems={meta.total}
              pageSize={meta.limit}
              onPageChange={(page) => void loadOrders(page)}
            />
          </div>
        )}

        {selectedId ? (
          <SectionCard title="Detail Pengiriman">
            {detailLoading ? (
              <LoadingSkeleton rows={4} />
            ) : activeOrder && detail ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <StatusBadge label={detail.statusLabel} variant={statusVariant(detail.status)} />
                  <StatusBadge label={detail.deliveryTypeLabel} variant="neutral" />
                </div>

                <div style={{ fontSize: 14 }}>
                  <p style={{ margin: '0 0 4px' }}>
                    <strong>{detail.customer.name}</strong> · {detail.customer.phone}
                  </p>
                  <p style={{ margin: 0, color: '#475569' }}>
                    {detail.address.label}: {detail.address.addressLine1}
                    {detail.address.addressLine2 ? `, ${detail.address.addressLine2}` : ''}, {detail.address.city}
                    {detail.address.province ? `, ${detail.address.province}` : ''}
                  </p>
                </div>

                {detail.transaction ? (
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Transaksi:{' '}
                    <Link href={`/dashboard/transactions?id=${detail.transaction.id}`}>
                      {detail.transaction.receiptNo}
                    </Link>{' '}
                    · {formatCurrencyIDR(detail.transaction.total)}
                  </p>
                ) : null}

                {detail.onlineOrder ? (
                  <p style={{ margin: 0, fontSize: 13 }}>
                    Order online:{' '}
                    {detail.onlineOrder.channelLabel ? (
                      <strong>{detail.onlineOrder.channelLabel} · </strong>
                    ) : null}
                    <Link href="/dashboard/online-orders">{detail.onlineOrder.orderNo}</Link>
                    {detail.onlineOrder.externalOrderRef ? (
                      <span> (ref: {detail.onlineOrder.externalOrderRef})</span>
                    ) : null}
                  </p>
                ) : null}

                {detail.deliveryType === 'ONLINE_ORDER' && detail.onlineOrder ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={printingLabel}
                    onClick={() => void handlePrintLabel(detail.onlineOrder!.id)}
                    style={{ minHeight: 44 }}
                  >
                    {printingLabel ? 'Menyiapkan…' : 'Cetak Label'}
                  </Button>
                ) : null}

                {detail.items.length > 0 ? (
                  <div>
                    <strong style={{ fontSize: 13 }}>Item ({detail.items.length})</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                      {detail.items.map((item, index) => (
                        <li key={`${item.productName}-${index}`}>
                          {item.productName} — {item.quantity}
                          {item.sellUnitSymbol ? ` ${item.sellUnitSymbol}` : ''} (
                          {formatCurrencyIDR(item.subtotal)})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {detail.notes ? (
                  <p style={{ margin: 0, fontSize: 13 }}>Catatan: {detail.notes}</p>
                ) : null}

                {detail.statusHistory.length > 0 ? (
                  <div>
                    <strong style={{ fontSize: 13 }}>Riwayat status</strong>
                    <ol style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#475569' }}>
                      {detail.statusHistory.map((log) => (
                        <li key={log.id} style={{ marginBottom: 4 }}>
                          {log.fromStatusLabel ? `${log.fromStatusLabel} → ` : ''}
                          <strong>{log.toStatusLabel}</strong> · {log.changedByName} ·{' '}
                          {new Date(log.createdAt).toLocaleString('id-ID')}
                          {log.notes ? ` — ${log.notes}` : ''}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                <Input
                  placeholder="Nama driver (opsional)"
                  value={driverName}
                  onChange={(event) => setDriverName(event.target.value)}
                />
                <Input
                  placeholder="Alasan batal (wajib jika batalkan)"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(DELIVERY_STATUS_TRANSITIONS[detail.status] ?? [])
                    .filter((status) => status !== 'BATAL')
                    .map((status) => (
                      <Button
                        key={status}
                        type="button"
                        disabled={actionLoading}
                        onClick={() => void handleAdvance(detail, status)}
                        style={{ minHeight: 44, flex: '1 1 auto' }}
                      >
                        → {DELIVERY_STATUS_LABELS[status]}
                      </Button>
                    ))}
                  {(DELIVERY_STATUS_TRANSITIONS[detail.status] ?? []).includes('BATAL') ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actionLoading}
                      onClick={() => void handleAdvance(detail, 'BATAL')}
                      style={{ minHeight: 44, width: '100%' }}
                    >
                      Batalkan pengiriman
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>Detail tidak tersedia.</p>
            )}
          </SectionCard>
        ) : null}
      </div>

      {labelData ? (
        <div aria-hidden style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <ShippingLabelPrint data={labelData} />
        </div>
      ) : null}
    </div>
  );
}
