'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  BreadcrumbNav,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  cardStyle,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import {
  PO_RETURN_REASON_LABELS,
  PO_STATUS_LABELS,
  cancelPurchaseOrder,
  cancelRemainingPurchaseOrder,
  fetchPurchaseOrder,
  formatPoDate,
  poStatusVariant,
  submitPurchaseOrder,
  type PurchaseOrderDetail,
} from '@/lib/suppliers-api';

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const purchaseOrderId = params.id;
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await fetchPurchaseOrder(purchaseOrderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat order.');
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function handleSubmit() {
    if (!order) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      setOrder(await submitPurchaseOrder(order.id));
      setSuccess('Order berhasil dikirim ke distributor.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim order.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!order) return;
    if (!window.confirm(`Batalkan order ${order.orderNo}?`)) return;
    setSaving(true);
    setError(null);
    try {
      setOrder(await cancelPurchaseOrder(order.id));
      setSuccess('Order dibatalkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan order.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRemaining() {
    if (!order) return;
    if (!window.confirm(`Batalkan sisa order yang belum diterima untuk ${order.orderNo}?`)) return;
    setSaving(true);
    setError(null);
    try {
      setOrder(await cancelRemainingPurchaseOrder(order.id));
      setSuccess('Sisa order yang belum datang dibatalkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membatalkan sisa order.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 960 }}>
        <LoadingSkeleton rows={6} />
      </div>
    );
  }

  if (!order) {
    return <AlertBanner variant="error">{error ?? 'Order tidak ditemukan.'}</AlertBanner>;
  }

  const canSubmit = order.status === 'DRAFT';
  const canCancel = order.status === 'DRAFT' || order.status === 'ORDERED';
  const canReceive = order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED';
  const canPrint = order.status !== 'DRAFT' && order.status !== 'CANCELLED';
  const canReturn = order.items.some((item) => item.returnableQuantity > 0);
  const canCancelRemaining = order.items.some((item) => item.remainingQuantity > 0) &&
    (order.status === 'ORDERED' || order.status === 'PARTIALLY_RECEIVED');

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <BreadcrumbNav
        items={[
          { label: 'Order Distributor', href: '/dashboard/purchase-orders' },
          { label: order.orderNo },
        ]}
      />
      <PageHeader
        title={order.orderNo}
        description={`Supplier: ${order.supplier.name} · ${order.outlet.name}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {canSubmit ? (
              <Button type="button" variant="primary" disabled={saving} onClick={() => void handleSubmit()}>
                Kirim ke Distributor
              </Button>
            ) : null}
            {canPrint ? (
              <Link href={`/dashboard/purchase-orders/${order.id}/print`} target="_blank">
                <Button type="button" variant="secondary">
                  Cetak Order
                </Button>
              </Link>
            ) : null}
            {canReceive ? (
              <Link href={`/dashboard/purchase-orders/${order.id}/receive`}>
                <Button type="button" variant="primary">
                  Terima Barang
                </Button>
              </Link>
            ) : null}
            {canReturn ? (
              <Link href={`/dashboard/purchase-orders/${order.id}/return`}>
                <Button type="button" variant="secondary">
                  Retur Barang
                </Button>
              </Link>
            ) : null}
            {canCancelRemaining ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => void handleCancelRemaining()}>
                Batalkan Sisa Order
              </Button>
            ) : null}
            {canCancel ? (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => void handleCancel()}>
                Batalkan
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <section style={{ ...cardStyle(), display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <StatusBadge variant={poStatusVariant(order.status)} label={PO_STATUS_LABELS[order.status]} />
          <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Dibuat {formatPoDate(order.createdAt)} · {order.createdByName}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tgl Order</div>
            <strong>{formatPoDate(order.orderedAt)}</strong>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Perkiraan Tiba</div>
            <strong>{formatPoDate(order.expectedDeliveryAt)}</strong>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Diterima Lengkap</div>
            <strong>{formatPoDate(order.receivedAt)}</strong>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Order</div>
            <strong>{formatCurrencyIDR(order.subtotal)}</strong>
          </div>
        </div>
        {order.notes ? <p style={{ margin: 0, color: '#334155' }}>{order.notes}</p> : null}
      </section>

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 1rem' }}>Barang Order</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyles.table}>
            <thead>
              <tr style={tableStyles.headRow}>
                <th style={tableStyles.th}>Produk</th>
                <th style={tableStyles.th}>Order</th>
                <th style={tableStyles.th}>Diterima</th>
                <th style={tableStyles.th}>Retur</th>
                <th style={tableStyles.th}>Sisa</th>
                <th style={tableStyles.th}>Harga Beli</th>
                <th style={tableStyles.th}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} style={tableStyles.row}>
                  <td style={tableStyles.td}>
                    {item.sku} — {item.productName}
                  </td>
                  <td style={tableStyles.td}>
                    {item.orderedQuantity} {item.unitSymbol ?? item.baseUnitSymbol ?? ''}
                  </td>
                  <td style={tableStyles.td}>{item.receivedQuantity}</td>
                  <td style={tableStyles.td}>{item.returnedQuantity}</td>
                  <td style={tableStyles.td}>{item.remainingQuantity}</td>
                  <td style={tableStyles.td}>
                    {formatCurrencyIDR(item.unitCost)} / {item.unitSymbol ?? 'unit'}
                  </td>
                  <td style={tableStyles.td}>{formatCurrencyIDR(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {order.receipts.length > 0 ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem' }}>Riwayat Penerimaan</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {order.receipts.map((receipt) => (
              <div key={receipt.id} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <strong>{formatPoDate(receipt.receivedAt)}</strong>
                <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>{receipt.createdByName}</span>
                {receipt.notes ? <div style={{ fontSize: '0.875rem', color: '#475569' }}>{receipt.notes}</div> : null}
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                  {receipt.lines.map((line, index) => (
                    <li key={`${receipt.id}-${index}`}>
                      {line.productName}: {line.quantityReceived} · HPP base {formatCurrencyIDR(line.baseCostApplied)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {order.returns.length > 0 ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem' }}>Riwayat Retur</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {order.returns.map((ret) => (
              <div key={ret.id} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <strong>{ret.returnNo}</strong>
                  <span style={{ color: '#64748b' }}>{formatPoDate(ret.returnedAt)}</span>
                  <span style={{ color: '#64748b' }}>{ret.createdByName}</span>
                  <Link href={`/dashboard/purchase-orders/${order.id}/returns/${ret.id}/print`} target="_blank">
                    <Button type="button" variant="ghost">
                      Cetak
                    </Button>
                  </Link>
                </div>
                {ret.notes ? <div style={{ fontSize: '0.875rem', color: '#475569' }}>{ret.notes}</div> : null}
                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                  {ret.lines.map((line, index) => (
                    <li key={`${ret.id}-${index}`}>
                      {line.productName}: {line.quantityReturned} ({PO_RETURN_REASON_LABELS[line.reason]}) ·{' '}
                      {formatCurrencyIDR(line.lineTotal)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {order.status === 'DRAFT' ? (
        <AlertBanner variant="info">
          Order masih draft. Kirim ke distributor agar bisa dicetak dan diterima barangnya nanti.
        </AlertBanner>
      ) : null}
    </div>
  );
}
