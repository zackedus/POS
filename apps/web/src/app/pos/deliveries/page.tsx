'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTodayDate, DEFAULT_PAGE_SIZE, type PaginationMeta, ONLINE_ORDER_CHANNEL_BADGE, type DeliveryOrderListItem, type DeliveryStatus, type OnlineOrderChannel } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { PosShiftBar } from '@/components/pos/PosShiftBar';
import { mapApiError } from '@/lib/api-client';
import { deliveryStatusExtraStyle, deliveryStatusVariant } from '@/lib/delivery-status-ui';
import { fetchDeliveries } from '@/lib/deliveries-api';
import { fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { useDeliveryBadge } from '@/hooks/useDeliveryBadge';
import { useDeliverySyncRefresh } from '@/hooks/useDeliverySyncRefresh';
import { useOnlineOrderBadge } from '@/hooks/useOnlineOrderBadge';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { StatusBadge, TablePagination } from '@/components/dashboard/dashboard-ui';

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

export default function PosDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [orders, setOrders] = useState<DeliveryOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });

  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const shiftOutletMismatch = Boolean(
    selectedOutletId && activeShift?.outletId && activeShift.outletId !== selectedOutletId,
  );

  const deliveryCount = useDeliveryBadge(Boolean(user), selectedOutletId);
  const onlineOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'WEB',
  });
  const marketplaceOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
    channel: 'MARKETPLACE',
  });

  useEffect(() => {
    void fetchMe()
      .then(setUser)
      .catch(() => router.replace('/login'));
  }, [router]);

  useEffect(() => {
    void fetchActiveShift(selectedOutletId ?? undefined)
      .then(setActiveShift)
      .catch(() => setActiveShift(null));
  }, [selectedOutletId]);

  const load = useCallback(async () => {
    if (!selectedOutletId && needsOutletPick) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = getTodayDate();
      const result = await fetchDeliveries({
        outletId: selectedOutletId ?? undefined,
        status: 'MENUNGGU,DISIAPKAN,DIKIRIM',
        dateFrom: today,
        dateTo: today,
        search: search || undefined,
        page,
        limit: pageSize,
      });
      setOrders(result.items);
      setMeta(result.meta);
      setError(null);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat antrian pengiriman.'));
    } finally {
      setLoading(false);
    }
  }, [selectedOutletId, needsOutletPick, search, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, selectedOutletId]);

  useEffect(() => {
    void load();
  }, [load]);

  useDeliverySyncRefresh({
    enabled: Boolean(user),
    outletId: selectedOutletId,
    onRefresh: load,
  });

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  return (
    <div style={{ minHeight: '100vh', background: colors.light.bg.muted }}>
      <PosShiftBar
        userName={user?.fullName ?? 'Kasir'}
        activeShift={activeShift}
        onlineOrderCount={onlineOrderCount}
        marketplaceOrderCount={marketplaceOrderCount}
        deliveryCount={deliveryCount}
        outlets={outlets}
        selectedOutletId={selectedOutletId}
        needsOutletPick={needsOutletPick}
        shiftOutletMismatch={shiftOutletMismatch}
        onOutletChange={setSelectedOutletId}
        onLogout={handleLogout}
      />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>Antrian Pengiriman</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>
            Tampilan baca saja untuk kasir — ubah status via Manager di Dashboard → Pengiriman.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <input
            type="search"
            placeholder="Cari no. DLV / pelanggan"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void load();
            }}
            style={{
              flex: '1 1 200px',
              minHeight: 44,
              padding: '0 0.75rem',
              borderRadius: 8,
              border: `1px solid ${colors.light.border.default}`,
            }}
          />
          <Button type="button" onClick={() => void load()} style={{ minHeight: 44 }}>
            Cari
          </Button>
        </div>

        {error ? (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 8,
              background: '#fef2f2',
              color: colors.semantic.error,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? <p style={{ color: colors.light.text.secondary }}>Memuat antrian…</p> : null}

        {!loading && !needsOutletPick && orders.length === 0 ? (
          <div
            style={{
              padding: '2rem 1rem',
              textAlign: 'center',
              borderRadius: 12,
              border: `1px dashed ${colors.light.border.default}`,
              background: colors.light.bg.base,
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>Belum ada pengiriman aktif hari ini</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
              Pengiriman dari checkout POS atau order web akan muncul di sini.
            </p>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {orders.map((order) => {
            const channelStyle = order.onlineOrder?.channel
              ? ONLINE_ORDER_CHANNEL_BADGE[order.onlineOrder.channel as OnlineOrderChannel]
              : null;
            return (
              <div
                key={order.id}
                style={{
                  border: `1px solid ${colors.light.border.default}`,
                  borderRadius: 12,
                  padding: '1rem',
                  background: colors.light.bg.base,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{order.deliveryNo}</strong>
                  <DeliveryStatusBadge status={order.status} label={order.statusLabel} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                    {order.deliveryTypeLabel}
                  </span>
                  {channelStyle && order.onlineOrder?.channelLabel ? (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: channelStyle.bg,
                        color: channelStyle.color,
                      }}
                    >
                      {order.onlineOrder.channelLabel}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>
                  {order.customer.name} · {order.customer.phone}
                </p>
                <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>
                  {order.addressSnippet}
                </p>
                {order.transaction ? (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8125rem' }}>
                    Struk: {order.transaction.receiptNo}
                  </p>
                ) : null}
                {order.onlineOrder ? (
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem' }}>
                    Order: {order.onlineOrder.orderNo}
                  </p>
                ) : null}
              </div>
            );
          })}
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
        </div>
      </main>
    </div>
  );
}
