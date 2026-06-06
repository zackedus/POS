'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { mapApiError } from '@/lib/api-client';
import {
  fetchFulfillmentQueue,
  updateOrderStatus,
  type FulfillmentOrder,
} from '@/lib/online-orders-api';

import { ONLINE_ORDERS_POLL_MS } from '@/hooks/useOnlineOrderBadge';

const NEXT_STATUS: Record<string, 'CONFIRMED' | 'READY' | 'COMPLETED' | null> = {
  PAID: 'CONFIRMED',
  CONFIRMED: 'READY',
  READY: 'COMPLETED',
};

const ACTION_LABEL: Record<string, string> = {
  PAID: 'Konfirmasi',
  CONFIRMED: 'Tandai siap',
  READY: 'Selesai / diserahkan',
};

export default function OnlineOrdersFulfillmentPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const items = await fetchFulfillmentQueue();
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
  }, []);

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
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, next);
      await load(true);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui status order. Coba lagi.'));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link href="/pos" style={{ color: colors.primary[600], textDecoration: 'none', fontSize: '0.875rem' }}>
            ← Kembali ke kasir
          </Link>
          <h1 style={{ margin: '0.5rem 0 0', fontSize: '1.25rem' }}>Order Online</h1>
          {lastUpdated ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
              Pembaruan otomatis setiap {ONLINE_ORDERS_POLL_MS / 1000} detik · terakhir {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          ) : null}
        </div>
        <Button variant="secondary" onClick={() => void load()}>
          Muat ulang
        </Button>
      </div>

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

      {!loading && orders.length === 0 ? (
        <p style={{ color: colors.light.text.secondary }}>Belum ada order web yang perlu disiapkan.</p>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {orders.map((order) => {
          const next = NEXT_STATUS[order.status];
          return (
            <div
              key={order.id}
              style={{
                border: `1px solid ${colors.light.border.default}`,
                borderRadius: 8,
                padding: '1rem',
                background: colors.light.bg.base,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{order.orderNo}</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                    {order.customerName} · {order.customerPhone}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
                    {order.fulfillmentTypeLabel} · {order.itemCount} item · {formatCurrency(order.total)}
                    {order.shippingFee > 0 ? ` (ongkir ${formatCurrency(order.shippingFee)})` : ''}
                  </p>
                  {order.fulfillmentType === 'DELIVERY' ? (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '0.5rem',
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
                  ) : null}
                  {order.deliveryAddressSnippet ? (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                      📍 {order.deliveryAddressSnippet}
                    </p>
                  ) : null}
                  {order.notes ? (
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                      Catatan: {order.notes}
                    </p>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      background: colors.primary[50],
                      color: colors.primary[700],
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {order.statusLabel}
                  </span>
                  {next ? (
                    <div style={{ marginTop: '0.75rem' }}>
                      <Button
                        disabled={updatingId === order.id}
                        onClick={() => void handleAdvance(order)}
                      >
                        {updatingId === order.id ? 'Menyimpan…' : ACTION_LABEL[order.status]}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
