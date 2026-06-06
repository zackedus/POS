'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { apiConfig, toUserFacingError } from '@/lib/api';
import {
  createBundle,
  deleteBundle,
  fetchBundles,
  updateBundle,
  upsertBundleOutletPolicy,
  type BundleRecord,
} from '@/lib/bundles-api';
import { canAccessDashboard, canViewCostPrice } from '@/lib/rbac';
import { authFetch, fetchMe, type AuthUser } from '@/lib/auth';
import { useOutletSelection } from '@/lib/outlet-selection-state';

interface ProductOption {
  id: string;
  sku: string;
  name: string;
  hasVariants?: boolean;
}

interface ComponentDraft {
  componentProductId: string;
  quantity: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: '100%',
  maxWidth: 640,
  maxHeight: '90vh',
  overflow: 'auto',
  background: '#fff',
  borderRadius: 12,
  padding: '1.25rem',
  border: '1px solid #e2e8f0',
};

function emptyDraft(): ComponentDraft {
  return { componentProductId: '', quantity: '1' };
}

export default function BundlesPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [bundles, setBundles] = useState<BundleRecord[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BundleRecord | null>(null);
  const [bundleProductId, setBundleProductId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState<ComponentDraft[]>([emptyDraft()]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { selectedOutletId } = useOutletSelection();

  const canManage = user ? canAccessDashboard(user.role) : false;
  const showCost = user ? canViewCostPrice(user.role) : false;

  const bundleProductOptions = useMemo(
    () => products.filter((p) => !p.hasVariants),
    [products],
  );
  const componentOptions = useMemo(
    () => products.filter((p) => !p.hasVariants),
    [products],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchMe();
      setUser(profile);
      const [bundleRows, productRes] = await Promise.all([
        fetchBundles(),
        authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products?limit=200`),
      ]);
      const productJson = (await productRes.json()) as ApiEnvelope<{ items: ProductOption[] }>;
      if (!productRes.ok || !productJson.success || !productJson.data) {
        throw new Error(productJson.error?.message ?? 'Gagal memuat produk.');
      }
      setBundles(bundleRows);
      setProducts(productJson.data.items ?? []);
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateModal() {
    setEditing(null);
    setBundleProductId('');
    setIsActive(true);
    setNotes('');
    setComponents([emptyDraft()]);
    setModalOpen(true);
    setSuccess(null);
    setError(null);
  }

  function openEditModal(bundle: BundleRecord) {
    setEditing(bundle);
    setBundleProductId(bundle.bundleProductId);
    setIsActive(bundle.isActive);
    setNotes(bundle.notes ?? '');
    setComponents(
      bundle.items.length > 0
        ? bundle.items.map((item) => ({
            componentProductId: item.componentProductId,
            quantity: String(item.quantity),
          }))
        : [emptyDraft()],
    );
    setModalOpen(true);
    setSuccess(null);
    setError(null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;

    const parsedItems = components
      .filter((row) => row.componentProductId && Number(row.quantity) > 0)
      .map((row) => ({
        componentProductId: row.componentProductId,
        quantity: Number(row.quantity),
      }));

    if (!editing && !bundleProductId) {
      setError('Pilih produk header bundle.');
      return;
    }
    if (parsedItems.length === 0) {
      setError('Minimal satu komponen dengan qty > 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateBundle(editing.bundleProductId, {
          items: parsedItems,
          isActive,
          notes: notes.trim() || undefined,
        });
        setSuccess('Bundle berhasil diperbarui.');
      } else {
        await createBundle({
          bundleProductId,
          items: parsedItems,
          isActive,
          notes: notes.trim() || undefined,
        });
        setSuccess('Bundle baru berhasil dibuat.');
      }
      closeModal();
      await loadData();
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal menyimpan bundle.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bundle: BundleRecord) {
    if (!canManage) return;
    const confirmed = window.confirm(`Hapus bundle "${bundle.bundleProduct.name}"?`);
    if (!confirmed) return;

    setDeletingId(bundle.id);
    setError(null);
    try {
      await deleteBundle(bundle.bundleProductId);
      setSuccess(`Bundle "${bundle.bundleProduct.name}" dihapus.`);
      await loadData();
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal menghapus bundle.'));
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleOutletPolicy(bundle: BundleRecord, outletId: string, nextActive: boolean) {
    if (!canManage) return;
    try {
      await upsertBundleOutletPolicy({
        bundleProductId: bundle.bundleProductId,
        outletId,
        isActive: nextActive,
      });
      setSuccess('Kebijakan outlet bundle disimpan.');
      await loadData();
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal menyimpan kebijakan outlet.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Paket Bundling"
        description="Kelola paket barang (semen + pipa + cat) dengan harga jual dan rollup modal komponen."
        breadcrumbs={[{ label: 'Master Data', href: '/master/products' }, { label: 'Paket Bundling' }]}
        helpText="Bundle aktif = SKU jual tunggal di kasir. Komponen qty harus lebih dari 0."
        actions={
          canManage ? (
            <Button type="button" onClick={openCreateModal}>
              + Buat bundle
            </Button>
          ) : null
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {loading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && bundles.length === 0 ? (
        <>
          <EmptyState
            title="Belum ada bundle"
            description="Buat paket bundling pertama untuk dijual sebagai SKU tunggal di kasir."
            icon="▣"
          />
          {canManage ? (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Button type="button" onClick={openCreateModal}>
                Buat bundle
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      {!loading && bundles.length > 0 ? (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {bundles.map((bundle) => {
            const invalidItems = bundle.items.filter((item) => item.quantity <= 0);
            const outletPolicy = bundle.outletPolicies?.find((p) => p.outletId === selectedOutletId);
            return (
              <SectionCard key={bundle.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>{bundle.bundleProduct.name}</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                      SKU {bundle.bundleProduct.sku} · Harga jual {formatCurrencyIDR(bundle.bundleProduct.price)}
                      {showCost && bundle.bundleProduct.rolledUpCost != null
                        ? ` · Modal rollup ${formatCurrencyIDR(bundle.bundleProduct.rolledUpCost)}`
                        : ''}
                      {showCost && bundle.bundleProduct.margin != null
                        ? ` · Margin ${formatCurrencyIDR(bundle.bundleProduct.margin)}`
                        : ''}
                    </p>
                    {bundle.notes ? (
                      <p style={{ margin: '0.35rem 0 0', color: '#475569', fontSize: '0.875rem' }}>{bundle.notes}</p>
                    ) : null}
                    {invalidItems.length > 0 ? (
                      <p style={{ margin: '0.35rem 0 0', color: '#b45309', fontSize: '0.8125rem' }}>
                        ⚠ {invalidItems.length} komponen qty tidak valid (harus &gt; 0).
                      </p>
                    ) : null}
                    {selectedOutletId && outletPolicy ? (
                      <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: '#475569' }}>
                        Outlet {outletPolicy.outlet.name}:{' '}
                        {outletPolicy.isActive ? 'aktif' : 'nonaktif'}
                      </p>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <StatusBadge label={bundle.isActive ? 'Aktif' : 'Nonaktif'} variant={bundle.isActive ? 'success' : 'error'} />
                    {canManage ? (
                      <>
                        <Button type="button" variant="secondary" onClick={() => openEditModal(bundle)}>
                          Edit
                        </Button>
                        {selectedOutletId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              void toggleOutletPolicy(bundle, selectedOutletId, !(outletPolicy?.isActive ?? true))
                            }
                          >
                            {outletPolicy?.isActive ?? true ? 'Nonaktifkan outlet' : 'Aktifkan outlet'}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={deletingId === bundle.id}
                          onClick={() => void handleDelete(bundle)}
                        >
                          {deletingId === bundle.id ? 'Menghapus…' : 'Hapus'}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div style={{ marginTop: '0.75rem' }}>
                  <DataTable stickyHeader={false}>
                    <thead>
                      <tr>
                        <th style={tableStyles.th}>Komponen</th>
                        <th style={tableStyles.th}>SKU</th>
                        <th style={tableStyles.th}>Qty</th>
                        {showCost ? <th style={tableStyles.th}>Modal/unit</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {bundle.items.map((item) => (
                        <tr key={item.id} style={item.quantity <= 0 ? { background: '#fffbeb' } : tableStyles.row}>
                          <td style={tableStyles.td}>{item.componentProduct.name}</td>
                          <td style={tableStyles.td}>{item.componentProduct.sku}</td>
                          <td style={{ ...tableStyles.td, color: item.quantity <= 0 ? '#b45309' : undefined }}>
                            {item.quantity}
                            {item.quantity <= 0 ? ' (tidak valid)' : ''}
                          </td>
                          {showCost ? (
                            <td style={tableStyles.td}>
                              {item.componentProduct.costPrice != null
                                ? formatCurrencyIDR(item.componentProduct.costPrice)
                                : '—'}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              </SectionCard>
            );
          })}
        </div>
      ) : null}

      {modalOpen ? (
        <div style={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="bundle-modal-title">
          <div style={modalCard}>
            <h2 id="bundle-modal-title" style={{ margin: '0 0 0.75rem' }}>
              {editing ? 'Edit bundle' : 'Buat bundle baru'}
            </h2>
            <form onSubmit={handleSave} style={{ display: 'grid', gap: '0.75rem' }}>
              {!editing ? (
                <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.875rem' }}>
                  <span>Produk header (SKU jual) *</span>
                  <select
                    value={bundleProductId}
                    onChange={(e) => setBundleProductId(e.target.value)}
                    required
                    style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  >
                    <option value="">Pilih produk…</option>
                    {bundleProductOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#475569' }}>
                  Header: <strong>{editing.bundleProduct.name}</strong> ({editing.bundleProduct.sku})
                </p>
              )}

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Bundle aktif
              </label>

              <Input label="Catatan (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />

              <div>
                <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Komponen *</p>
                {components.map((row, index) => (
                  <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <select
                      value={row.componentProductId}
                      onChange={(e) => {
                        const next = [...components];
                        next[index] = { ...row, componentProductId: e.target.value };
                        setComponents(next);
                      }}
                      style={{ flex: 2, minWidth: 180, padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                    >
                      <option value="">Pilih komponen…</option>
                      {componentOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                    <Input
                      label=""
                      aria-label={`Qty komponen ${index + 1}`}
                      value={row.quantity}
                      onChange={(e) => {
                        const next = [...components];
                        next[index] = { ...row, quantity: e.target.value };
                        setComponents(next);
                      }}
                      placeholder="Qty"
                      style={{ width: 100 }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setComponents(components.filter((_, i) => i !== index))}
                      disabled={components.length <= 1}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" onClick={() => setComponents([...components, emptyDraft()])}>
                  + Tambah komponen
                </Button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <Button type="button" variant="secondary" onClick={closeModal} disabled={saving}>
                  Batal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan…' : editing ? 'Simpan perubahan' : 'Buat bundle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
