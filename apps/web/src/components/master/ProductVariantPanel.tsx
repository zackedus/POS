'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, generateVariantSku } from '@barokah/shared';
import { Button, CurrencyInput, Input, QuantityInput } from '@barokah/ui';
import { adjustStock, fetchInventory } from '@/lib/inventory-api';
import { fetchMe } from '@/lib/auth';
import { AutoGenerateBadge, AutoGenerateHelper, autoFieldLabelStyle } from './AutoGenerateHints';
import {
  createProductVariant,
  deleteProductVariant,
  fetchProductVariants,
  updateProductVariant,
  type ProductVariant,
} from '@/lib/variants-api';

const panelStyle = {
  marginTop: '0.75rem',
  padding: '0.875rem',
  borderRadius: '10px',
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
} as const;

const emptyForm = {
  sku: '',
  name: '',
  variantLabel: '',
  price: '',
  costPrice: '',
  barcode: '',
  stockQty: '',
};

type VariantForm = typeof emptyForm;

export function ProductVariantPanel({
  parentProductId,
  parentName,
  parentSku,
  unitSymbol,
  onVariantsChanged,
  showCostFields,
}: {
  parentProductId: string;
  parentName: string;
  parentSku: string;
  unitSymbol?: string;
  onVariantsChanged?: () => void;
  showCostFields?: boolean;
}) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VariantForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false);
  const [skuAutoFilled, setSkuAutoFilled] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<VariantForm>(emptyForm);

  const loadVariants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductVariants(parentProductId);
      setVariants(data);
      try {
        const me = await fetchMe();
        const outletId = me?.outletIds?.[0];
        const inventory = await fetchInventory(outletId ? { outletId } : undefined);
        const stockMap: Record<string, number> = {};
        for (const item of inventory.items) {
          stockMap[item.productId] = item.quantity;
        }
        setStockByProductId(stockMap);
      } catch {
        setStockByProductId({});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat varian.');
      setVariants([]);
    } finally {
      setLoading(false);
    }
  }, [parentProductId]);

  useEffect(() => {
    void loadVariants();
  }, [loadVariants]);

  useEffect(() => {
    if (skuManuallyEdited || !form.variantLabel.trim()) return;
    const nextSku = generateVariantSku(parentSku, form.variantLabel, {
      existingSkus: variants.map((v) => v.sku),
    });
    const autoName = `${parentName} — ${form.variantLabel.trim()}`;
    setSkuAutoFilled(true);
    setForm((prev) => {
      if (prev.sku === nextSku && prev.name === autoName) return prev;
      if (prev.sku === nextSku && prev.name.trim()) return prev;
      return {
        ...prev,
        sku: nextSku,
        name: prev.name.trim() ? prev.name : autoName,
      };
    });
  }, [form.variantLabel, parentName, parentSku, skuManuallyEdited, variants]);

  function handleCreateSkuChange(value: string) {
    setSkuManuallyEdited(true);
    setSkuAutoFilled(false);
    setForm((prev) => ({ ...prev, sku: value }));
  }

  function handleRegenerateSku() {
    setSkuManuallyEdited(false);
    const nextSku = generateVariantSku(parentSku, form.variantLabel, {
      existingSkus: variants.map((v) => v.sku),
    });
    setSkuAutoFilled(true);
    setForm((prev) => ({ ...prev, sku: nextSku }));
  }

  function validateForm(values: VariantForm): string | null {
    if (!values.sku.trim() || !values.name.trim() || !values.variantLabel.trim() || !values.price.trim()) {
      return 'SKU, nama, label varian, dan harga wajib diisi.';
    }
    if (!Number.isInteger(Number(values.price)) || Number(values.price) < 0) {
      return 'Harga jual harus angka bulat rupiah dan tidak boleh negatif.';
    }
    if (showCostFields && values.costPrice?.trim()) {
      if (!Number.isInteger(Number(values.costPrice)) || Number(values.costPrice) < 0) {
        return 'Harga beli harus angka bulat rupiah dan tidak boleh negatif.';
      }
    }
    if (values.stockQty?.trim() && Number(values.stockQty) < 0) {
      return 'Stok awal tidak boleh negatif.';
    }
    return null;
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const validation = validateForm(form);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createProductVariant(parentProductId, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        variantLabel: form.variantLabel.trim(),
        price: Number(form.price),
        barcode: form.barcode.trim() || undefined,
        ...(showCostFields && form.costPrice?.trim()
          ? { costPrice: Number(form.costPrice) }
          : {}),
      });
      const stockQty = Number(form.stockQty);
      if (stockQty > 0) {
        const me = await fetchMe();
        const outletId = me?.outletIds?.[0];
        if (outletId) {
          await adjustStock({
            outletId,
            productId: created.id,
            direction: 'IN',
            quantity: stockQty,
            notes: 'Stok awal varian',
          });
        }
      }
      setForm(emptyForm);
      setSkuManuallyEdited(false);
      setSkuAutoFilled(false);
      await loadVariants();
      onVariantsChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menambahkan varian.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(variant: ProductVariant) {
    setEditingId(variant.id);
    setEditForm({
      sku: variant.sku,
      name: variant.name,
      variantLabel: variant.variantLabel ?? '',
      price: String(variant.price),
      costPrice: variant.costPrice != null ? String(variant.costPrice) : '',
      barcode: variant.barcode ?? '',
      stockQty: '',
    });
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function handleUpdate(variantId: string) {
    const validation = validateForm(editForm);
    if (validation) {
      setFormError(validation);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await updateProductVariant(parentProductId, variantId, {
        sku: editForm.sku.trim(),
        name: editForm.name.trim(),
        variantLabel: editForm.variantLabel.trim(),
        price: Number(editForm.price),
        barcode: editForm.barcode.trim() || null,
        ...(showCostFields
          ? { costPrice: editForm.costPrice?.trim() ? Number(editForm.costPrice) : 0 }
          : {}),
      });
      cancelEdit();
      await loadVariants();
      onVariantsChanged?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal memperbarui varian.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(variant: ProductVariant) {
    const confirmed = window.confirm(`Hapus varian "${variant.variantLabel ?? variant.name}"?`);
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProductVariant(parentProductId, variant.id);
      if (editingId === variant.id) cancelEdit();
      await loadVariants();
      onVariantsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus varian.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>Varian — {parentName}</h3>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: '#64748b' }}>
        Stok dan penjualan kasir menggunakan SKU varian{unitSymbol ? ` (satuan: ${unitSymbol})` : ''}.
      </p>

      {error ? (
        <p style={{ margin: '0 0 0.75rem', color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
      ) : null}
      {loading ? <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Memuat varian…</p> : null}

      {!loading && variants.length === 0 ? (
        <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
          Belum ada varian. Tambahkan SKU varian di bawah.
        </p>
      ) : null}

      {!loading && variants.length > 0 ? (
        <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem' }}>Label</th>
                <th style={{ padding: '0.5rem' }}>SKU</th>
                <th style={{ padding: '0.5rem' }}>Nama</th>
                <th style={{ padding: '0.5rem' }}>Harga jual</th>
                {showCostFields ? <th style={{ padding: '0.5rem' }}>Harga beli</th> : null}
                <th style={{ padding: '0.5rem' }}>Stok</th>
                <th style={{ padding: '0.5rem' }}>Status</th>
                <th style={{ padding: '0.5rem' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) =>
                editingId === variant.id ? (
                  <tr key={variant.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <td colSpan={showCostFields ? 8 : 7} style={{ padding: '0.5rem' }}>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.5rem' }}>
                          <Input label="SKU" value={editForm.sku} onChange={(e) => setEditForm((p) => ({ ...p, sku: e.target.value }))} fullWidth disabled={saving} />
                          <Input label="Nama" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} fullWidth disabled={saving} />
                          <CurrencyInput label="Harga jual (IDR)" value={editForm.price} onChange={(price) => setEditForm((p) => ({ ...p, price }))} fullWidth disabled={saving} />
                          {showCostFields ? (
                            <CurrencyInput label="Harga beli (IDR)" value={editForm.costPrice} onChange={(costPrice) => setEditForm((p) => ({ ...p, costPrice }))} fullWidth disabled={saving} />
                          ) : null}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '0.5rem', alignItems: 'end' }}>
                          <Input label="Label varian" value={editForm.variantLabel} onChange={(e) => setEditForm((p) => ({ ...p, variantLabel: e.target.value }))} fullWidth disabled={saving} />
                          <Input label="Barcode" value={editForm.barcode} onChange={(e) => setEditForm((p) => ({ ...p, barcode: e.target.value }))} fullWidth disabled={saving} />
                          <Button type="button" disabled={saving} onClick={() => void handleUpdate(variant.id)}>Simpan</Button>
                          <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>Batal</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={variant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem' }}><strong>{variant.variantLabel}</strong></td>
                    <td style={{ padding: '0.5rem' }}>{variant.sku}</td>
                    <td style={{ padding: '0.5rem' }}>{variant.name}</td>
                    <td style={{ padding: '0.5rem' }}>{formatCurrencyIDR(variant.price)}</td>
                    {showCostFields ? (
                      <td style={{ padding: '0.5rem' }}>{formatCurrencyIDR(variant.costPrice ?? 0)}</td>
                    ) : null}
                    <td style={{ padding: '0.5rem' }}>
                      {stockByProductId[variant.id] != null
                        ? `${stockByProductId[variant.id]} ${unitSymbol ?? ''}`.trim()
                        : '—'}
                    </td>
                    <td style={{ padding: '0.5rem' }}>{variant.isActive ? 'Aktif' : 'Nonaktif'}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{ display: 'flex', gap: '0.375rem' }}>
                        <Button type="button" variant="secondary" disabled={saving} onClick={() => startEdit(variant)}>Ubah</Button>
                        <Button type="button" variant="ghost" disabled={saving} onClick={() => void handleDelete(variant)}>Hapus</Button>
                      </span>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <form onSubmit={handleCreate} style={{ display: 'grid', gap: '0.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>Tambah varian baru</p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: showCostFields ? '1fr 2fr 1fr 1fr' : '1fr 2fr 1fr',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'grid', gap: '0.375rem' }}>
            <div style={autoFieldLabelStyle()}>
              <label htmlFor="variant-sku" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                SKU varian
              </label>
              {skuAutoFilled && !skuManuallyEdited ? <AutoGenerateBadge /> : null}
            </div>
            <Input
              id="variant-sku"
              aria-label="SKU varian"
              value={form.sku}
              onChange={(e) => handleCreateSkuChange(e.target.value)}
              placeholder="CAT-25L"
              fullWidth
              disabled={saving}
            />
            <AutoGenerateHelper>SKU dibuat otomatis, bisa diubah manual</AutoGenerateHelper>
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={handleRegenerateSku}
              style={{ justifySelf: 'start', padding: '0.25rem 0.5rem', fontSize: '0.8125rem' }}
            >
              Generate ulang
            </Button>
          </div>
          <Input label="Nama varian" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={`${parentName} — 25 Liter`} fullWidth disabled={saving} />
          <CurrencyInput label="Harga jual (IDR)" value={form.price} onChange={(price) => setForm((p) => ({ ...p, price }))} placeholder="85.000" fullWidth disabled={saving} />
          {showCostFields ? (
            <CurrencyInput label="Harga beli (IDR)" value={form.costPrice} onChange={(costPrice) => setForm((p) => ({ ...p, costPrice }))} placeholder="70.000" fullWidth disabled={saving} />
          ) : null}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
          <Input label="Label varian" value={form.variantLabel} onChange={(e) => setForm((p) => ({ ...p, variantLabel: e.target.value }))} placeholder="25 Liter" fullWidth disabled={saving} />
          <Input label="Barcode (opsional)" value={form.barcode} onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))} fullWidth disabled={saving} />
          <QuantityInput label="Stok awal (opsional)" value={form.stockQty} onChange={(stockQty) => setForm((p) => ({ ...p, stockQty }))} placeholder="0" disabled={saving} />
          <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Tambah varian'}</Button>
        </div>
        {formError ? (
          <p style={{ margin: 0, color: '#b45309', fontSize: '0.8125rem' }}>{formError}</p>
        ) : null}
      </form>
    </div>
  );
}
