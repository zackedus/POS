'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button, QuantityInput } from '@barokah/ui';
import {
  AlertBanner,
  BreadcrumbNav,
  LoadingSkeleton,
  PageHeader,
  cardStyle,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import {
  PO_RETURN_REASON_LABELS,
  createPurchaseOrderReturn,
  fetchPurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderItemRow,
  type PurchaseOrderReturnReason,
} from '@/lib/suppliers-api';

interface ReturnDraft {
  purchaseOrderItemId: string;
  quantityReturned: string;
  reason: PurchaseOrderReturnReason;
}

function buildDraft(items: PurchaseOrderItemRow[]): ReturnDraft[] {
  return items
    .filter((item) => item.returnableQuantity > 0)
    .map((item) => ({
      purchaseOrderItemId: item.id,
      quantityReturned: '0',
      reason: 'DAMAGED' as PurchaseOrderReturnReason,
    }));
}

export default function ReturnPurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const purchaseOrderId = params.id;
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [lines, setLines] = useState<ReturnDraft[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchPurchaseOrder(purchaseOrderId);
      setOrder(detail);
      setLines(buildDraft(detail.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat order.');
    } finally {
      setLoading(false);
    }
  }, [purchaseOrderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  function updateLine(itemId: string, patch: Partial<ReturnDraft>) {
    setLines((prev) => prev.map((line) => (line.purchaseOrderItemId === itemId ? { ...line, ...patch } : line)));
  }

  async function handleReturn(e: FormEvent) {
    e.preventDefault();
    if (!order) return;

    const items = lines
      .map((line) => ({
        purchaseOrderItemId: line.purchaseOrderItemId,
        quantityReturned: Number(line.quantityReturned),
        reason: line.reason,
      }))
      .filter((line) => line.quantityReturned > 0);

    if (items.length === 0) {
      setError('Isi minimal satu baris dengan jumlah retur > 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createPurchaseOrderReturn(order.id, {
        notes: notes.trim() || undefined,
        items,
      });
      router.push(`/dashboard/purchase-orders/${order.id}/returns/${created.id}/print`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat retur barang.');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 960 }}>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (!order) {
    return <AlertBanner variant="error">{error ?? 'Order tidak ditemukan.'}</AlertBanner>;
  }

  const returnableItems = order.items.filter((item) => item.returnableQuantity > 0);

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <BreadcrumbNav
        items={[
          { label: 'Order Distributor', href: '/dashboard/purchase-orders' },
          { label: order.orderNo, href: `/dashboard/purchase-orders/${order.id}` },
          { label: 'Retur Barang' },
        ]}
      />
      <PageHeader
        title="Retur Barang ke Distributor"
        description={`Pilih barang yang dikembalikan dari order ${order.orderNo}. Stok akan berkurang; HPP produk tidak diubah.`}
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {returnableItems.length === 0 ? (
        <AlertBanner variant="info">Tidak ada barang yang bisa diretur pada order ini.</AlertBanner>
      ) : (
        <form onSubmit={(e) => void handleReturn(e)} style={{ ...cardStyle(), display: 'grid', gap: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyles.table}>
              <thead>
                <tr style={tableStyles.headRow}>
                  <th style={tableStyles.th}>Produk</th>
                  <th style={tableStyles.th}>Diterima</th>
                  <th style={tableStyles.th}>Sudah Retur</th>
                  <th style={tableStyles.th}>Bisa Retur</th>
                  <th style={tableStyles.th}>Qty Retur</th>
                  <th style={tableStyles.th}>Alasan</th>
                  <th style={tableStyles.th}>Dampak Stok (base)</th>
                </tr>
              </thead>
              <tbody>
                {returnableItems.map((item) => {
                  const draft = lines.find((line) => line.purchaseOrderItemId === item.id);
                  const qty = Number(draft?.quantityReturned ?? 0);
                  const baseImpact = qty * item.conversionToBase;

                  return (
                    <tr key={item.id} style={tableStyles.row}>
                      <td style={tableStyles.td}>
                        {item.sku} — {item.productName}
                      </td>
                      <td style={tableStyles.td}>
                        {item.receivedQuantity} {item.unitSymbol ?? ''}
                      </td>
                      <td style={tableStyles.td}>{item.returnedQuantity}</td>
                      <td style={tableStyles.td}>{item.returnableQuantity}</td>
                      <td style={tableStyles.td}>
                        <QuantityInput
                          value={draft?.quantityReturned ?? '0'}
                          onChange={(quantityReturned) =>
                            updateLine(item.id, { purchaseOrderItemId: item.id, quantityReturned })
                          }
                          aria-label={`Retur ${item.productName}`}
                        />
                      </td>
                      <td style={tableStyles.td}>
                        <select
                          value={draft?.reason ?? 'DAMAGED'}
                          onChange={(e) =>
                            updateLine(item.id, {
                              purchaseOrderItemId: item.id,
                              reason: e.target.value as PurchaseOrderReturnReason,
                            })
                          }
                          style={{ padding: '0.4rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                        >
                          {Object.entries(PO_RETURN_REASON_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tableStyles.td}>
                        −{baseImpact} {item.baseUnitSymbol ?? 'base'}
                        <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          Nilai: {formatCurrencyIDR(Math.round(qty * item.unitCost))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <textarea
            placeholder="Catatan retur (opsional) — mis. barang rusak saat bongkar"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="submit" variant="primary" disabled={saving}>
              Konfirmasi Retur & Cetak
            </Button>
            <Link href={`/dashboard/purchase-orders/${order.id}`}>
              <Button type="button" variant="ghost">
                Batal
              </Button>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
