'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { derivePurchaseCostFromBaseCost, formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput, QuantityInput } from '@barokah/ui';
import {
  AlertBanner,
  BreadcrumbNav,
  PageHeader,
  cardStyle,
} from '@/components/dashboard/dashboard-ui';
import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { createPurchaseOrder, fetchSuppliers, submitPurchaseOrder } from '@/lib/suppliers-api';

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  costPrice?: number;
  unit?: { id: string; symbol: string; name: string } | null;
  purchaseUnit?: { id: string; symbol: string; name: string; conversionToBase: number } | null;
}

interface OrderLine {
  id: string;
  productId: string;
  quantity: string;
  unitCost: string;
  unitId: string;
}

function newLine(): OrderLine {
  return { id: crypto.randomUUID(), productId: '', quantity: '1', unitCost: '', unitId: '' };
}

function defaultUnitCost(product: ProductOption | undefined): string {
  if (!product) return '';
  const baseCost = product.costPrice ?? 0;
  if (product.purchaseUnit && baseCost > 0) {
    return String(derivePurchaseCostFromBaseCost(baseCost, product.purchaseUnit.conversionToBase));
  }
  return baseCost > 0 ? String(baseCost) : '';
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    notes: '',
    expectedDeliveryAt: '',
    items: [newLine()],
  });

  useEffect(() => {
    void (async () => {
      try {
        const [supplierRows, productRes] = await Promise.all([
          fetchSuppliers(),
          authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products`),
        ]);
        setSuppliers(supplierRows.filter((s) => s.isActive));
        const json = (await productRes.json()) as { success: boolean; data?: ProductOption[] };
        if (productRes.ok && json.success && json.data) {
          setProducts(json.data.filter((p) => p.sku !== 'CAT-PARENT'));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data.');
      }
    })();
  }, []);

  function updateLine(lineId: string, patch: Partial<OrderLine>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    }));
  }

  async function handleSubmit(e: FormEvent, submitAfterSave: boolean) {
    e.preventDefault();
    if (!form.supplierId) return;

    const items = form.items
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        const unitId = line.unitId || product?.purchaseUnit?.id || product?.unit?.id;
        const unitCost = parseCurrencyInput(line.unitCost || defaultUnitCost(product));
        return {
          productId: line.productId,
          quantity: Number(line.quantity),
          unitCost,
          ...(unitId ? { unitId } : {}),
        };
      });

    if (items.length === 0) {
      setError('Tambahkan minimal satu produk dengan jumlah valid.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await createPurchaseOrder({
        outletId: selectedOutletId ?? undefined,
        supplierId: form.supplierId,
        notes: form.notes.trim() || undefined,
        expectedDeliveryAt: form.expectedDeliveryAt || undefined,
        items,
      });

      if (submitAfterSave) {
        await submitPurchaseOrder(created.id);
      }

      router.push(`/dashboard/purchase-orders/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan order.');
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, display: 'grid', gap: '1.25rem' }}>
      <BreadcrumbNav
        items={[
          { label: 'Order Distributor', href: '/dashboard/purchase-orders' },
          { label: 'Buat Order' },
        ]}
      />
      <PageHeader
        title="Buat Order Distributor"
        description="Susun barang, harga beli per satuan distributor, lalu simpan draft atau langsung kirim order."
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header sebelum membuat order.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <form
        onSubmit={(e) => void handleSubmit(e, false)}
        style={{ ...cardStyle(), display: 'grid', gap: '1rem' }}
      >
        <select
          required
          value={form.supplierId}
          onChange={(e) => setForm((p) => ({ ...p, supplierId: e.target.value }))}
          style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
        >
          <option value="">Pilih supplier…</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={form.expectedDeliveryAt}
          onChange={(e) => setForm((p) => ({ ...p, expectedDeliveryAt: e.target.value }))}
          style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
          aria-label="Perkiraan tiba"
        />

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <strong>Baris produk</strong>
          {form.items.map((line) => {
            const product = products.find((p) => p.id === line.productId);
            const unitSymbol = product?.purchaseUnit?.symbol ?? product?.unit?.symbol ?? 'unit';
            return (
              <div
                key={line.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 100px 140px 140px auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                }}
              >
                <select
                  required
                  value={line.productId}
                  onChange={(e) => {
                    const selected = products.find((p) => p.id === e.target.value);
                    updateLine(line.id, {
                      productId: e.target.value,
                      unitId: selected?.purchaseUnit?.id ?? selected?.unit?.id ?? '',
                      unitCost: defaultUnitCost(selected),
                    });
                  }}
                  style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                >
                  <option value="">Pilih produk…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <QuantityInput
                  value={line.quantity}
                  onChange={(quantity) => updateLine(line.id, { quantity })}
                  aria-label="Jumlah"
                />
                <CurrencyInput
                  value={line.unitCost}
                  onChange={(unitCost) => updateLine(line.id, { unitCost })}
                  placeholder="Harga beli"
                  aria-label="Harga beli per satuan"
                />
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>/ {unitSymbol}</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={form.items.length <= 1}
                  onClick={() =>
                    setForm((p) => ({ ...p, items: p.items.filter((row) => row.id !== line.id) }))
                  }
                >
                  Hapus
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="secondary" onClick={() => setForm((p) => ({ ...p, items: [...p.items, newLine()] }))}>
            + Tambah baris produk
          </Button>
        </div>

        <textarea
          placeholder="Catatan untuk supplier (opsional)"
          value={form.notes}
          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          rows={3}
          style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
        />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button type="submit" variant="secondary" disabled={saving || needsOutletPick}>
            Simpan Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={saving || needsOutletPick}
            onClick={(e) => void handleSubmit(e as unknown as FormEvent, true)}
          >
            Simpan & Kirim Order
          </Button>
          <Link href="/dashboard/purchase-orders">
            <Button type="button" variant="ghost">
              Batal
            </Button>
          </Link>
        </div>
      </form>

      {form.items.some((line) => line.productId && line.quantity && line.unitCost) ? (
        <section style={cardStyle()}>
          <strong>Pratinjau subtotal</strong>
          <p style={{ margin: '0.5rem 0 0', fontSize: '1.125rem' }}>
            {formatCurrencyIDR(
              form.items.reduce((sum, line) => {
                const qty = Number(line.quantity);
                const cost = parseCurrencyInput(line.unitCost);
                return sum + (qty > 0 && cost >= 0 ? Math.round(qty * cost) : 0);
              }, 0),
            )}
          </p>
        </section>
      ) : null}
    </div>
  );
}
