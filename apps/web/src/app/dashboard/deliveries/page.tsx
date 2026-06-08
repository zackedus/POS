'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDeliverySyncRefresh } from '@/hooks/useDeliverySyncRefresh';
import Link from 'next/link';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_TYPE_LABELS,
  formatCurrencyIDR,
  getTodayDate,
  ONLINE_ORDER_CHANNEL_BADGE,
  type DeliveryOrderDetail,
  type DeliveryOrderListItem,
  type DeliveryQueueSummary,
  type DeliveryStatus,
  type DeliveryType,
  type OnlineOrderChannel,
} from '@barokah/shared';
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
import { deliveryStatusExtraStyle, deliveryStatusVariant } from '@/lib/delivery-status-ui';
import { publishDeliveryUpdated } from '@/lib/delivery-sync';
import {
  fetchDeliveries,
  fetchDeliveryDetail,
  fetchDeliveryQueueSummary,
  fetchDeliveryShippingLabel,
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

const CHANNEL_TABS: Array<{ value: OnlineOrderChannel | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Semua channel' },
  { value: 'WEB', label: 'Order Web' },
  { value: 'TOKOPEDIA', label: 'Tokopedia' },
  { value: 'SHOPEE', label: 'Shopee' },
];

function DeliveryStatusBadge({ status, label }: { status: DeliveryStatus; label: string }) {
  const extra = deliveryStatusExtraStyle(status);
  if (extra) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          ...extra,
        }}
      >
        {label}
      </span>
    );
  }
  return <StatusBadge label={label} variant={deliveryStatusVariant(status)} />;
}

function ChannelBadgePill({ channel, channelLabel }: { channel: string; channelLabel: string }) {
  const style = ONLINE_ORDER_CHANNEL_BADGE[channel as OnlineOrderChannel] ?? ONLINE_ORDER_CHANNEL_BADGE.OTHER;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        background: style.bg,
        color: style.color,
      }}
    >
      {style.icon ? `${style.icon} ` : ''}
      {channelLabel}
    </span>
  );
}

type PendingAction = {
  order: DeliveryOrderListItem | DeliveryOrderDetail;
  nextStatus: DeliveryStatus;
};

export default function DashboardDeliveriesPage() {
  const { outlets, selectedOutletId } = useOutletSelection();
  const multiOutlet = outlets.length > 1;
  const [outletFilter, setOutletFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<DeliveryStatus | 'ALL'>('ALL');
  const [typeTab, setTypeTab] = useState<DeliveryType | 'ALL'>('ALL');
  const [channelTab, setChannelTab] = useState<OnlineOrderChannel | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState(() => getTodayDate());
  const [dateTo, setDateTo] = useState(() => getTodayDate());
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState<DeliveryOrderListItem[]>([]);
  const [summary, setSummary] = useState<DeliveryQueueSummary | null>(null);
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
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const statusFilter = useMemo(() => {
    if (activeTab === 'ALL') return 'MENUNGGU,DISIAPKAN,DIKIRIM';
    return activeTab;
  }, [activeTab]);

  const queryOutletId = useMemo(() => {
    if (outletFilter === 'ALL') return undefined;
    return outletFilter;
  }, [outletFilter]);

  const channelFilter = useMemo(() => {
    if (typeTab === 'STORE_DIRECT') return undefined;
    if (channelTab === 'ALL') return undefined;
    return channelTab;
  }, [typeTab, channelTab]);

  const detailOutletId = queryOutletId ?? selectedOutletId ?? undefined;

  useEffect(() => {
    if (!multiOutlet && selectedOutletId) {
      setOutletFilter(selectedOutletId);
    }
  }, [multiOutlet, selectedOutletId]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await fetchDeliveryQueueSummary({
        outletId: queryOutletId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setSummary(data);
    } catch {
      setSummary(null);
    }
  }, [queryOutletId, dateFrom, dateTo]);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDeliveries({
          outletId: queryOutletId,
          deliveryType: typeTab === 'ALL' ? undefined : typeTab,
          channel: channelFilter,
          status: statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: search || undefined,
          page,
          limit: 20,
        });
        setOrders(result.items);
        setMeta(result.meta);
        await loadSummary();
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat antrian pengiriman.'));
      } finally {
        setLoading(false);
      }
    },
    [queryOutletId, statusFilter, typeTab, channelFilter, dateFrom, dateTo, search, loadSummary],
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

  useDeliverySyncRefresh({
    enabled: true,
    outletId: queryOutletId ?? selectedOutletId ?? null,
    onRefresh: () => loadOrders(meta.page),
  });

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function requestAdvance(order: DeliveryOrderListItem | DeliveryOrderDetail, nextStatus: DeliveryStatus) {
    if (nextStatus === 'BATAL' && cancelReason.trim().length < 3) {
      setError('Alasan pembatalan wajib diisi (min. 3 karakter).');
      return;
    }
    setPendingAction({ order, nextStatus });
  }

  async function confirmAdvance() {
    if (!pendingAction) return;
    const { order, nextStatus } = pendingAction;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await updateDeliveryStatus(
        order.id,
        {
          status: nextStatus,
          driverName: driverName.trim() || undefined,
          cancelReason: nextStatus === 'BATAL' ? cancelReason.trim() : undefined,
        },
        detailOutletId,
      );
      publishDeliveryUpdated({
        deliveryNo: updated.deliveryNo,
        deliveryId: updated.id,
        outletId: updated.outlet.id,
        status: updated.status,
      });
      setCancelReason('');
      setPendingAction(null);
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

  async function handlePrintLabel(order: DeliveryOrderDetail) {
    setPrintingLabel(true);
    try {
      let data: ShippingLabelData;
      if (order.deliveryType === 'ONLINE_ORDER' && order.onlineOrder) {
        data = await fetchShippingLabel(order.onlineOrder.id, detailOutletId);
      } else {
        data = await fetchDeliveryShippingLabel(order.id, detailOutletId);
      }
      setLabelData(data);
      window.setTimeout(() => printShippingLabel(), 150);
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyiapkan label pengiriman.'));
    } finally {
      setPrintingLabel(false);
    }
  }

  const activeOrder = detail ?? orders.find((row) => row.id === selectedId) ?? null;

  const summaryCards = [
    { key: 'MENUNGGU' as const, label: DELIVERY_STATUS_LABELS.MENUNGGU, color: '#fef3c7', text: '#92400e' },
    { key: 'DISIAPKAN' as const, label: DELIVERY_STATUS_LABELS.DISIAPKAN, color: '#dbeafe', text: '#1e40af' },
    { key: 'DIKIRIM' as const, label: DELIVERY_STATUS_LABELS.DIKIRIM, color: '#f3e8ff', text: '#6b21a8' },
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title="Antrian Pengiriman"
        description="Kelola pengiriman toko langsung (POS) dan order online ke alamat pelanggan."
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {summaryCards.map((card) => (
            <div
              key={card.key}
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: card.color,
                color: card.text,
                border: '1px solid rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600 }}>{card.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>{summary[card.key]}</div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>hari ini (WIB)</div>
            </div>
          ))}
        </div>
      ) : null}

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
              onClick={() => {
                setTypeTab(tab.value);
                if (tab.value === 'STORE_DIRECT') setChannelTab('ALL');
              }}
              style={{ minHeight: 44 }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        {typeTab !== 'STORE_DIRECT' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {CHANNEL_TABS.map((tab) => (
              <Button
                key={tab.value}
                type="button"
                variant={channelTab === tab.value ? 'primary' : 'secondary'}
                onClick={() => setChannelTab(tab.value)}
                style={{ minHeight: 44 }}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        ) : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              variant={activeTab === tab.value ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.value)}
              style={{ minHeight: 44 }}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <Input
            placeholder="Cari no. DLV / pelanggan / struk / order"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void loadOrders(1);
            }}
          />
          <Button type="button" onClick={() => void loadOrders(1)} style={{ minHeight: 44 }}>
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
            {orders.map((order, index) => {
              const nextStatuses = DELIVERY_STATUS_TRANSITIONS[order.status] ?? [];
              const isSelected = selectedId === order.id;
              const zebra = index % 2 === 1 ? '#f8fafc' : '#fff';
              return (
                <SectionCard key={order.id} title={`${order.deliveryNo} · ${order.customer.name}`}>
                  <div style={{ display: 'grid', gap: 8, background: zebra, margin: '-0.5rem', padding: '0.5rem', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                      <DeliveryStatusBadge status={order.status} label={order.statusLabel} />
                      <StatusBadge label={order.deliveryTypeLabel} variant="neutral" />
                      {order.onlineOrder?.channelLabel && order.onlineOrder.channel ? (
                        <ChannelBadgePill
                          channel={order.onlineOrder.channel}
                          channelLabel={order.onlineOrder.channelLabel}
                        />
                      ) : null}
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
                        <Link href={`/dashboard/online-orders?id=${order.onlineOrder.id}`}>
                          Order {order.onlineOrder.orderNo}
                        </Link>
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
                        style={{ minHeight: 44 }}
                      >
                        {isSelected ? 'Tutup detail' : 'Detail'}
                      </Button>
                      {nextStatuses.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          variant={status === 'BATAL' ? 'secondary' : undefined}
                          disabled={actionLoading}
                          onClick={() => requestAdvance(order, status)}
                          style={{ minHeight: 44 }}
                        >
                          {status === 'BATAL' ? 'Batalkan' : `→ ${DELIVERY_STATUS_LABELS[status]}`}
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
              <div style={{ display: 'grid', gap: 12, gridTemplateRows: '1fr auto' }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <DeliveryStatusBadge status={detail.status} label={detail.statusLabel} />
                    <StatusBadge label={detail.deliveryTypeLabel} variant="neutral" />
                    {detail.onlineOrder?.channelLabel && detail.onlineOrder.channel ? (
                      <ChannelBadgePill
                        channel={detail.onlineOrder.channel}
                        channelLabel={detail.onlineOrder.channelLabel}
                      />
                    ) : null}
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
                      <Link href={`/dashboard/online-orders?id=${detail.onlineOrder.id}`}>
                        {detail.onlineOrder.orderNo}
                      </Link>
                      {detail.onlineOrder.externalOrderRef ? (
                        <span> (ref: {detail.onlineOrder.externalOrderRef})</span>
                      ) : null}
                    </p>
                  ) : null}

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={printingLabel}
                    onClick={() => void handlePrintLabel(detail)}
                    style={{ minHeight: 44 }}
                  >
                    {printingLabel ? 'Menyiapkan…' : 'Cetak Label'}
                  </Button>

                  {detail.items.length > 0 ? (
                    <div>
                      <strong style={{ fontSize: 13 }}>Item ({detail.items.length})</strong>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                        {detail.items.map((item, itemIndex) => (
                          <li key={`${item.productName}-${itemIndex}`}>
                            {item.productName} — {item.quantity}
                            {item.sellUnitSymbol ? ` ${item.sellUnitSymbol}` : ''} (
                            {formatCurrencyIDR(item.subtotal)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {detail.notes ? <p style={{ margin: 0, fontSize: 13 }}>Catatan: {detail.notes}</p> : null}

                  {detail.status === 'BATAL' && detail.cancelReason ? (
                    <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                      Alasan batal: <strong>{detail.cancelReason}</strong>
                    </p>
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
                </div>

                {(DELIVERY_STATUS_TRANSITIONS[detail.status] ?? []).length > 0 ? (
                  <div
                    style={{
                      position: 'sticky',
                      bottom: 0,
                      background: '#fff',
                      borderTop: '1px solid #e2e8f0',
                      paddingTop: 12,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <Input
                      placeholder="Nama driver (opsional)"
                      value={driverName}
                      onChange={(event) => setDriverName(event.target.value)}
                    />
                    {(DELIVERY_STATUS_TRANSITIONS[detail.status] ?? []).includes('BATAL') ? (
                      <Input
                        placeholder="Alasan batal (wajib min. 3 karakter)"
                        value={cancelReason}
                        onChange={(event) => setCancelReason(event.target.value)}
                      />
                    ) : null}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(DELIVERY_STATUS_TRANSITIONS[detail.status] ?? [])
                        .filter((status) => status !== 'BATAL')
                        .map((status) => (
                          <Button
                            key={status}
                            type="button"
                            disabled={actionLoading}
                            onClick={() => requestAdvance(detail, status)}
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
                          onClick={() => requestAdvance(detail, 'BATAL')}
                          style={{ minHeight: 44, width: '100%' }}
                        >
                          Batalkan pengiriman
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: 0, color: '#64748b' }}>Detail tidak tersedia.</p>
            )}
          </SectionCard>
        ) : null}
      </div>

      {pendingAction ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delivery-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: 16,
          }}
          onClick={() => !actionLoading && setPendingAction(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 20,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-delivery-title" style={{ margin: '0 0 8px', fontSize: 16 }}>
              {pendingAction.nextStatus === 'BATAL' ? 'Batalkan pengiriman?' : 'Ubah status pengiriman?'}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: '#475569' }}>
              {pendingAction.order.deliveryNo} →{' '}
              <strong>{DELIVERY_STATUS_LABELS[pendingAction.nextStatus]}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                disabled={actionLoading}
                onClick={() => setPendingAction(null)}
                style={{ minHeight: 44 }}
              >
                Batal
              </Button>
              <Button type="button" disabled={actionLoading} onClick={() => void confirmAdvance()} style={{ minHeight: 44 }}>
                {actionLoading ? 'Menyimpan…' : 'Ya, lanjutkan'}
              </Button>
            </div>
          </div>
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
