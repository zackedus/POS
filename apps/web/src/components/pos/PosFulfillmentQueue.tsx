'use client';

import { useState } from 'react';
import { formatCurrency, formatPhoneDisplay, ONLINE_ORDER_CHANNEL_BADGE, type OnlineOrderChannel } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { ShippingLabelPrint, printShippingLabel } from '@/components/pos/ShippingLabelPrint';
import {
  fetchShippingLabel,
  shipOnlineOrder,
  updateOrderStatus,
  type FulfillmentOrder,
  type ShippingLabelData,
} from '@/lib/online-orders-api';

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

function ChannelBadge({ channel, channelLabel }: { channel: string; channelLabel: string }) {
  const style = ONLINE_ORDER_CHANNEL_BADGE[channel as OnlineOrderChannel] ?? ONLINE_ORDER_CHANNEL_BADGE.OTHER;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.5rem',
        borderRadius: 4,
        background: style.bg,
        color: style.color,
        fontSize: '0.75rem',
        fontWeight: 700,
      }}
    >
      {style.icon} {channelLabel}
    </span>
  );
}

export interface PosFulfillmentQueueProps {
  orders: FulfillmentOrder[];
  loading: boolean;
  error: string | null;
  needsOutletPick: boolean;
  selectedOutletId: string | null;
  emptyTitle: string;
  emptyDescription: string;
  showChannelBadge?: boolean;
  onReload: () => void;
}

export function PosFulfillmentQueue({
  orders,
  loading,
  error,
  needsOutletPick,
  selectedOutletId,
  emptyTitle,
  emptyDescription,
  showChannelBadge = false,
  onReload,
}: PosFulfillmentQueueProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null);
  const [labelOrderId, setLabelOrderId] = useState<string | null>(null);
  const [printingLabel, setPrintingLabel] = useState(false);

  async function handleAdvance(order: FulfillmentOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (order.fulfillmentType === 'DELIVERY' && order.status === 'READY' && order.delivery?.status !== 'DIKIRIM') {
      setQueueError('Tandai "Kirim" terlebih dahulu sebelum menyelesaikan order pengiriman.');
      return;
    }
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(order.id, next, selectedOutletId ?? undefined);
      onReload();
      setQueueError(null);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Gagal memperbarui status order.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleShip(order: FulfillmentOrder) {
    setUpdatingId(order.id);
    try {
      await shipOnlineOrder(order.id, selectedOutletId ?? undefined);
      onReload();
      setQueueError(null);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Gagal menandai order dikirim.');
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
      setQueueError(err instanceof Error ? err.message : 'Gagal menyiapkan label pengiriman.');
      setLabelData(null);
      setLabelOrderId(null);
    } finally {
      setPrintingLabel(false);
    }
  }

  const displayError = queueError ?? error;

  return (
    <>
      {loading ? <p style={{ color: colors.light.text.secondary }}>Memuat antrian…</p> : null}
      {displayError ? (
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
          {displayError}
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
          <p style={{ margin: 0, fontWeight: 600 }}>{emptyTitle}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: colors.light.text.secondary }}>
            {emptyDescription}
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
                    {showChannelBadge && order.channel ? (
                      <ChannelBadge channel={order.channel} channelLabel={order.channelLabel ?? order.channel} />
                    ) : null}
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

                  {order.externalOrderRef ? (
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                      Ref marketplace: <strong>{order.externalOrderRef}</strong>
                    </p>
                  ) : null}

                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.9375rem', fontWeight: 600 }}>
                    {order.customerName} · {formatPhoneDisplay(order.customerPhone)}
                  </p>

                  {(order.deliveryAddressFull || order.deliveryAddressSnippet) && isDelivery ? (
                    <p
                      style={{
                        margin: '0.35rem 0 0',
                        fontSize: '0.8125rem',
                        color: colors.light.text.secondary,
                        lineHeight: 1.45,
                      }}
                    >
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
    </>
  );
}
