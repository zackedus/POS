'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_TRANSITIONS } from '@barokah/shared';
import type { DeliveryOrderListItem, DeliveryStatus } from '@barokah/shared';
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
  updateDeliveryStatus,
  type PaginatedDeliveries,
} from '@/lib/deliveries-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const STATUS_TABS: Array<{ value: DeliveryStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Semua aktif' },
  { value: 'MENUNGGU', label: DELIVERY_STATUS_LABELS.MENUNGGU },
  { value: 'DISIAPKAN', label: DELIVERY_STATUS_LABELS.DISIAPKAN },
  { value: 'DIKIRIM', label: DELIVERY_STATUS_LABELS.DIKIRIM },
  { value: 'SELESAI', label: DELIVERY_STATUS_LABELS.SELESAI },
  { value: 'BATAL', label: DELIVERY_STATUS_LABELS.BATAL },
];

function statusVariant(status: DeliveryStatus): 'neutral' | 'warning' | 'success' | 'error' {
  if (status === 'SELESAI') return 'success';
  if (status === 'BATAL') return 'error';
  if (status === 'MENUNGGU') return 'warning';
  return 'neutral';
}

export default function DashboardDeliveriesPage() {
  const { selectedOutletId } = useOutletSelection();
  const [activeTab, setActiveTab] = useState<DeliveryStatus | 'ALL'>('ALL');
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
  const [actionLoading, setActionLoading] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const statusFilter = useMemo(() => {
    if (activeTab === 'ALL') return 'MENUNGGU,DISIAPKAN,DIKIRIM';
    return activeTab;
  }, [activeTab]);

  const loadOrders = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDeliveries({
          outletId: selectedOutletId ?? undefined,
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
    [selectedOutletId, statusFilter, dateFrom, dateTo, search],
  );

  useEffect(() => {
    void loadOrders(1);
  }, [loadOrders]);

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
        selectedOutletId ?? undefined,
      );
      setCancelReason('');
      setSelectedId(null);
      await loadOrders(meta.page);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui status pengiriman.'));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PageHeader
        title="Antrian Pengiriman"
        description="Kelola pengiriman barang ke proyek / alamat pelanggan dari transaksi POS."
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <SectionCard title="Filter">
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

      {loading ? (
        <LoadingSkeleton rows={6} />
      ) : orders.length === 0 ? (
        <EmptyState title="Belum ada pengiriman" description="Pengiriman dari POS akan muncul di sini." />
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
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {new Date(order.createdAt).toLocaleString('id-ID')}
                    </span>
                    {order.transaction ? (
                      <Link href={`/dashboard/transactions?receipt=${order.transaction.receiptNo}`}>
                        Struk {order.transaction.receiptNo}
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
                    <Button type="button" variant="secondary" onClick={() => setSelectedId(isSelected ? null : order.id)}>
                      {isSelected ? 'Tutup aksi' : 'Kelola'}
                    </Button>
                    {nextStatuses
                      .filter((status) => status !== 'BATAL')
                      .map((status) => (
                        <Button
                          key={status}
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleAdvance(order, status)}
                        >
                          → {DELIVERY_STATUS_LABELS[status]}
                        </Button>
                      ))}
                  </div>

                  {isSelected ? (
                    <div style={{ display: 'grid', gap: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
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
                      {nextStatuses.includes('BATAL') ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={actionLoading}
                          onClick={() => void handleAdvance(order, 'BATAL')}
                        >
                          Batalkan pengiriman
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
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
    </div>
  );
}
