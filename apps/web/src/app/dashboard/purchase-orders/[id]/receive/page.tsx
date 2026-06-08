'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { deriveBaseCostFromPurchaseCost, formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput, QuantityInput } from '@barokah/ui';
import {
  AlertBanner,
  BreadcrumbNav,
  LoadingSkeleton,
  PageHeader,
  cardStyle,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import {
  fetchPurchaseOrder,
  receivePurchaseOrder,
  type PurchaseOrderDetail,
  type PurchaseOrderItemRow,
} from '@/lib/suppliers-api';

interface ReceiveDraft {
  purchaseOrderItemId: string;
  quantityReceived: string;
  unitCost: string;
}

function buildDraft(items: PurchaseOrderItemRow[]): ReceiveDraft[] {
  return items
    .filter((item) => item.remainingQuantity > 0)
    .map((item) => ({
      purchaseOrderItemId: item.id,
      quantityReceived: String(item.remainingQuantity),
      unitCost: String(item.unitCost),
    }));
}

export default function ReceivePurchaseOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const purchaseOrderId = params.id;
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [lines, setLines] = useState<ReceiveDraft[]>([]);
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

  function updateLine(itemId: string, patch: Partial<ReceiveDraft>) {
    setLines((prev) => prev.map((line) => (line.purchaseOrderItemId === itemId ? { ...line, ...patch } : line)));
  }

  async function handleReceive(e: FormEvent) {
    e.preventDefault();
    if (!order) return;

    const items = lines
      .map((line) => ({
        purchaseOrderItemId: line.purchaseOrderItemId,
        quantityReceived: Number(line.quantityReceived),
        unitCost: parseCurrencyInput(line.unitCost),
      }))
      .filter((line) => line.quantityReceived > 0);

    if (items.length === 0) {
      setError('Isi minimal satu baris dengan jumlah diterima > 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await receivePurchaseOrder(order.id, {
        notes: notes.trim() || undefined,
        items,
      });
      router.push(`/dashboard/purchase-orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerima barang.');
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

  const openItems = order.items.filter((item) => item.remainingQuantity > 0);

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <BreadcrumbNav
        items={[
          { label: 'Order Distributor', href: '/dashboard/purchase-orders' },
          { label: order.orderNo, href: `/dashboard/purchase-orders/${order.id}` },
          { label: 'Terima Barang' },
        ]}
      />
      <PageHeader
        title="Terima Barang"
        description={`Cocokkan qty diterima vs order ${order.orderNo}. Stok dan HPP produk akan diperbarui.`}
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {openItems.length === 0 ? (
        <AlertBanner variant="info">Semua barang pada order ini sudah diterima.</AlertBanner>
      ) : (
        <form onSubmit={(e) => void handleReceive(e)} style={{ ...cardStyle(), display: 'grid', gap: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyles.table}>
              <thead>
                <tr style={tableStyles.headRow}>
                  <th style={tableStyles.th}>Produk</th>
                  <th style={tableStyles.th}>Order</th>
                  <th style={tableStyles.th}>Sudah Diterima</th>
                  <th style={tableStyles.th}>Terima Sekarang</th>
                  <th style={tableStyles.th}>Harga Beli / Unit</th>
                  <th style={tableStyles.th}>HPP Base (preview)</th>
                </tr>
              </thead>
              <tbody>
                {openItems.map((item) => {
                  const draft = lines.find((line) => line.purchaseOrderItemId === item.id);
                  const unitCost = parseCurrencyInput(draft?.unitCost ?? String(item.unitCost));
                  const previewBaseCost = deriveBaseCostFromPurchaseCost(unitCost, item.conversionToBase);

                  return (
                    <tr key={item.id} style={tableStyles.row}>
                      <td style={tableStyles.td}>
                        {item.sku} — {item.productName}
                      </td>
                      <td style={tableStyles.td}>
                        {item.orderedQuantity} {item.unitSymbol ?? ''}
                      </td>
                      <td style={tableStyles.td}>{item.receivedQuantity}</td>
                      <td style={tableStyles.td}>
                        <QuantityInput
                          value={draft?.quantityReceived ?? '0'}
                          onChange={(quantityReceived) =>
                            updateLine(item.id, { purchaseOrderItemId: item.id, quantityReceived })
                          }
                          aria-label={`Terima ${item.productName}`}
                        />
                      </td>
                      <td style={tableStyles.td}>
                        <CurrencyInput
                          aria-label={`Harga beli ${item.productName}`}
                          value={draft?.unitCost ?? String(item.unitCost)}
                          onChange={(unitCost) =>
                            updateLine(item.id, {
                              purchaseOrderItemId: item.id,
                              unitCost,
                            })
                          }
                          style={{ width: 120, padding: '0.4rem 0.6rem', fontSize: '0.875rem' }}
                        />
                        <span style={{ marginLeft: '0.35rem', fontSize: '0.82rem', color: '#64748b' }}>
                          / {item.unitSymbol ?? 'unit'}
                        </span>
                      </td>
                      <td style={tableStyles.td}>
                        {formatCurrencyIDR(previewBaseCost)} / {item.baseUnitSymbol ?? 'base'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <textarea
            placeholder="Catatan penerimaan (opsional) — mis. 1 dus rusak"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="submit" variant="primary" disabled={saving}>
              Konfirmasi Terima Barang
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
