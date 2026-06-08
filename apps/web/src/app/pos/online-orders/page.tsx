'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatPhoneDisplay } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { PosShiftBar } from '@/components/pos/PosShiftBar';
import { ShippingLabelPrint, printShippingLabel } from '@/components/pos/ShippingLabelPrint';
import { mapApiError } from '@/lib/api-client';
import { fetchMe, tokenStorage, type AuthUser } from '@/lib/auth';
import {
  fetchFulfillmentQueue,
  fetchShippingLabel,
  shipOnlineOrder,
  updateOrderStatus,
  type FulfillmentOrder,
  type ShippingLabelData,
} from '@/lib/online-orders-api';
import { fetchActiveShift, type ShiftSummary } from '@/lib/shifts-api';
import { useOnlineOrderBadge, ONLINE_ORDERS_POLL_MS } from '@/hooks/useOnlineOrderBadge';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const NEXT_STATUS: Record<string, 'CONFIRMED' | 'READY' | 'COMPLETED' | null> = {
  PAID: 'CONFIRMED',
  CONFIRMED: 'READY',
  READY: 'COMPLETED',
};

const ACTION_LABEL: Record<string, string> = {
  PAID: 'Konfirmasi',
  CONFIRMED: 'Tandai Disiapkan',
  READY: 'Selesai / diserahkan',
};

function statusBadgeColor(status: string): { bg: string; color: string } {
  if (status === 'PAID') return { bg: '#DBEAFE', color: '#1D4ED8' };
  if (status === 'CONFIRMED') return { bg: '#FEF3C7', color: '#92400E' };
  if (status === 'READY') return { bg: '#DCFCE7', color: '#166534' };
  return { bg: colors.primary[50], color: colors.primary[700] };
}

export default function OnlineOrdersFulfillmentPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const shiftOutletMismatch = Boolean(
    selectedOutletId && activeShift?.outletId && activeShift.outletId !== selectedOutletId,
  );

  const onlineOrderCount = useOnlineOrderBadge(Boolean(user), {
    outletId: selectedOutletId ?? undefined,
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

  const load = useCallback(
    async (silent = false) => {
      if (!selectedOutletId && needsOutletPick) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (!silent) {
        setLoading(true);
      }
      try {
        const items = await fetchFulfillmentQueue(selectedOutletId ?? undefined);
        setOrders(items);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        setError(mapApiError(err, 'Gagal memuat antrian order online.'));
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [selectedOutletId, needsOutletPick],
  );

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load(true);
    }, ONLINE_ORDERS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function handleAdvance(order: FulfillmentOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (order.fulfillmentType === 'DELIVERY' && order.status === 'READY' && order.delivery?.status !== 'DIKIRIM') {
      setError('Tandai "Kirim" terlebih dahulu sebelum menyelesaikan order pengiriman.');
      return;
    }
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, next, selectedOutletId ?? undefined);
      await load(true);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui status order. Coba lagi.'));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleShip(order: FulfillmentOrder) {
    setUpdatingId(order.id);
    try {
      await shipOnlineOrder(order.id, selectedOutletId ?? undefined);
      await load(true);
    } catch (err) {
      setError(mapApiError(err, 'Gagal menandai order dikirim.'));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handlePrintLabel(order: FulfillmentOrder) {
    setPrintingLabel(true);
    setLabelOrderId(order.id);
    try {
      const data = await fetchShippingLabel(order.id, selectedOutletId ?? undefined);
      setLabelData(data);
      window.setTimeout(() => {
        printShippingLabel();
      }, 150);
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyiapkan label pengiriman.'));
      setLabelData(null);
      setLabelOrderId(null);
    } finally {
      setPrintingLabel(false);
    }
  }

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  const selectedOutletLabel = outlets.find((o) => o.id === selectedOutletId)?.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f8fafc' }}>
      {user ? (
        <PosShiftBar
          userName={user.fullName}
          activeShift={activeShift}
          onlineOrderCount={onlineOrderCount}
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          needsOutletPick={needsOutletPick}
          shiftOutletMismatch={shiftOutletMismatch}
          onOutletChange={setSelectedOutletId}
          onLogout={handleLogout}
        />
      ) : null}

      <div style={{ padding: '1rem', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem' }}>Order Online</h1>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
              Alur: Order masuk → Disiapkan → Cetak label → Kirim → Selesai
              {selectedOutletLabel ? ` · ${selectedOutletLabel}` : ''}
            </p>
            {lastUpdated ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                Pembaruan otomatis setiap {ONLINE_ORDERS_POLL_MS / 1000} detik · terakhir{' '}
                {lastUpdated.toLocaleTimeString('id-ID')}
              </p>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/deliveries" style={{ textDecoration: 'none' }}>
              <Button variant="secondary">Antrian pengiriman</Button>
            </Link>
            <Button variant="secondary" onClick={() => void load()}>
              Muat ulang
            </Button>
          </div>
        </div>

        {needsOutletPick ? (
          <div
            role="alert"
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 8,
              background: '#fff7ed',
              color: '#9a3412',
              border: '1px solid #fed7aa',
            }}
          >
            Pilih cabang aktif di header untuk melihat order online cabang tersebut.
          </div>
        ) : null}

        {loading ? <p style={{ color: colors.light.text.secondary }}>Memuat antrian…</p> : null}
        {error ? (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 8,
              background: '#fef2f2',
              color: colors.semantic.error,
              border: `1px solid ${colors.semantic.error}`,
            }}
          >
            {error}
          </div>
        ) : null}

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
            <p style={{ margin: 0, fontWeight: 600 }}>Belum ada order web yang perlu disiapkan</p>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
              Order baru muncul setelah pembayaran berhasil (status Dibayar) untuk cabang{' '}
              {selectedOutletLabel ?? 'terpilih'}.
            </p>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {orders.map((order) => {
            const next = NEXT_STATUS[order.status];
            const badge = statusBadgeColor(order.status);
            const isDelivery = order.fulfillmentType === 'DELIVERY';
            const canPrintLabel = isDelivery && (order.status === 'READY' || order.status === 'CONFIRMED');
            const canShip =
              isDelivery &&
              order.status === 'READY' &&
              order.delivery &&
              order.delivery.status !== 'DIKIRIM' &&
              order.delivery.status !== 'SELESAI';
            const completeBlocked =
              isDelivery && order.status === 'READY' && order.delivery?.status !== 'DIKIRIM';

            return (
              <div
                key={order.id}
                style={{
                  border: `1px solid ${colors.light.border.default}`,
                  borderRadius: 12,
                  padding: '1rem',
                  background: colors.light.bg.base,
                  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontFamily: 'ui-monospace, monospace', fontSize: '1rem' }}>
                        {order.orderNo}
                      </p>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 999,
                          background: badge.bg,
                          color: badge.color,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {order.statusLabel}
                      </span>
                      {isDelivery ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 4,
                            background: '#FEF3C7',
                            color: '#92400E',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          🚚 Antar
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 4,
                            background: '#E0E7FF',
                            color: '#3730A3',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          📍 Pickup
                        </span>
                      )}
                    </div>

                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                      {order.customerName} · {formatPhoneDisplay(order.customerPhone)}
                    </p>

                    {(order.deliveryAddressFull || order.deliveryAddressSnippet) && isDelivery ? (
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary, lineHeight: 1.45 }}>
                        📍 {order.deliveryAddressFull ?? order.deliveryAddressSnippet}
                      </p>
                    ) : null}

                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
                      {order.fulfillmentTypeLabel} · {order.itemCount} item · {formatCurrency(order.total)}
                      {order.shippingFee > 0 ? ` (ongkir ${formatCurrency(order.shippingFee)})` : ''}
                    </p>

                    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8125rem', color: '#334155' }}>
                      {order.items.slice(0, 4).map((item) => (
                        <li key={`${order.id}-${item.sku}`}>
                          {item.quantity}× {item.productName}
                        </li>
                      ))}
                      {order.items.length > 4 ? (
                        <li style={{ color: colors.light.text.secondary }}>+{order.items.length - 4} item lainnya</li>
                      ) : null}
                    </ul>

                    {order.delivery ? (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem' }}>
                        Pengiriman:{' '}
                        <strong style={{ fontFamily: 'ui-monospace, monospace' }}>{order.delivery.deliveryNo}</strong> ·{' '}
                        {order.delivery.statusLabel}
                      </p>
                    ) : null}

                    {order.notes ? (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                        Catatan: {order.notes}
                      </p>
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 180 }}>
                    {next ? (
                      <Button
                        disabled={updatingId === order.id || completeBlocked}
                        onClick={() => void handleAdvance(order)}
                        style={{ minHeight: 44 }}
                      >
                        {updatingId === order.id
                          ? 'Menyimpan…'
                          : completeBlocked
                            ? 'Kirim dulu'
                            : ACTION_LABEL[order.status]}
                      </Button>
                    ) : null}

                    {canPrintLabel ? (
                      <Button
                        variant="secondary"
                        disabled={printingLabel && labelOrderId === order.id}
                        onClick={() => void handlePrintLabel(order)}
                        style={{ minHeight: 44 }}
                      >
                        {printingLabel && labelOrderId === order.id ? 'Menyiapkan…' : 'Cetak Label'}
                      </Button>
                    ) : null}

                    {canShip ? (
                      <Button
                        variant="secondary"
                        disabled={updatingId === order.id}
                        onClick={() => void handleShip(order)}
                        style={{ minHeight: 44 }}
                      >
                        Kirim
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {labelData ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            pointerEvents: 'none',
          }}
        >
          <ShippingLabelPrint data={labelData} />
        </div>
      ) : null}
    </div>
  );
}
