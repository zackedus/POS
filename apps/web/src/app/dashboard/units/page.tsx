'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button, Input } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  TablePagination,
  tableStyles,
  useClientPagination,
} from '@/components/dashboard/dashboard-ui';
import { apiConfig } from '@/lib/api';
import { authFetch, fetchMe, type AuthUser } from '@/lib/auth';
import { canAccessDashboard } from '@/lib/rbac';

interface UnitUsage {
  baseProductCount: number;
  conversionEntryCount: number;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
  usage?: UnitUsage;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

function usageLabel(unit: Unit): string {
  const base = unit.usage?.baseProductCount ?? 0;
  const conversions = unit.usage?.conversionEntryCount ?? 0;
  const parts: string[] = [];
  if (base > 0) parts.push(`${base} satuan dasar`);
  if (conversions > 0) parts.push(`${conversions} konversi beli/jual`);
  return parts.length > 0 ? parts.join(' · ') : 'Belum dipakai produk';
}

export default function DashboardUnitsPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSymbol, setEditSymbol] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = currentUser ? canAccessDashboard(currentUser.role) : false;
  const { page, totalPages, pageItems, setPage, totalItems, pageSize } = useClientPagination(units, 10);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, res] = await Promise.all([fetchMe(), authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/units`)]);
      setCurrentUser(me);
      const json = (await res.json()) as ApiEnvelope<Unit[]>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal memuat data satuan.');
      }
      setUnits(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !symbol.trim()) {
      setCreateError('Nama dan simbol satuan wajib diisi.');
      return;
    }
    setSaving(true);
    setCreateError(null);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), symbol: symbol.trim() }),
      });
      const json = (await res.json()) as ApiEnvelope<Unit>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal menambahkan satuan.');
      }
      setName('');
      setSymbol('');
      await loadUnits();
      setSuccess('Satuan baru berhasil ditambahkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(unit: Unit) {
    setEditingId(unit.id);
    setEditName(unit.name);
    setEditSymbol(unit.symbol);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditSymbol('');
  }

  async function handleUpdate(unitId: string) {
    if (!editName.trim() || !editSymbol.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), symbol: editSymbol.trim() }),
      });
      const json = (await res.json()) as ApiEnvelope<Unit>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal memperbarui satuan.');
      }
      cancelEdit();
      await loadUnits();
      setSuccess('Perubahan satuan berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(unit: Unit) {
    const confirmed = window.confirm(
      `Hapus satuan "${unit.name} (${unit.symbol})"? Satuan yang masih dipakai produk tidak dapat dihapus.`,
    );
    if (!confirmed) return;

    setDeletingId(unit.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/units/${unit.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal menghapus satuan.');
      }
      if (editingId === unit.id) cancelEdit();
      await loadUnits();
      setSuccess(`Satuan "${unit.name}" berhasil dihapus.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        title="Master Satuan"
        description="Kelola daftar satuan tenant (kg, dus, sak, pcs, liter). Konversi beli/jual diatur per produk."
      />

      <div style={{ ...cardStyle(), marginBottom: '1rem', background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#166534' }}>Model multi-satuan</h3>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#15803d', lineHeight: 1.5 }}>
          <strong>Satuan dasar</strong> dipakai untuk stok internal (contoh: kg).{' '}
          <strong>Satuan beli</strong> dan <strong>faktor konversi</strong> (contoh: 1 dus = 25 kg) serta{' '}
          <strong>satuan jual</strong> alternatif diatur di{' '}
          <Link href="/master/products" style={{ color: '#15803d', fontWeight: 600 }}>
            Master Produk
          </Link>{' '}
          → panel &quot;Satuan Beli &amp; Jual&quot; per produk.
        </p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', color: '#166534' }}>
          Contoh paku: stok di kg, beli per dus (faktor 25), jual per kg atau per dus.
        </p>
      </div>

      {error ? (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner variant="error" onRetry={() => void loadUnits()}>
            <strong>Gagal memproses data satuan.</strong> {error}
          </AlertBanner>
        </div>
      ) : null}
      {success ? (
        <div style={{ marginBottom: '1rem' }}>
          <AlertBanner variant="success">{success}</AlertBanner>
        </div>
      ) : null}

      {canEdit ? (
        <section style={{ ...cardStyle(), marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1rem' }}>Tambah satuan baru</h3>
          <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.875rem' }}>
            Simbol dipakai di layar stok, PO, dan struk (contoh: kg, dus, sak).
          </p>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <Input
                label="Nama satuan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kilogram"
                fullWidth
                disabled={saving}
              />
              <Input
                label="Simbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="kg"
                fullWidth
                disabled={saving}
              />
              <Button type="submit" disabled={saving || !name.trim() || !symbol.trim()}>
                {saving ? 'Menyimpan…' : 'Tambah'}
              </Button>
            </div>
            {createError ? <p style={{ margin: 0, color: '#b45309', fontSize: '0.875rem' }}>{createError}</p> : null}
          </form>
        </section>
      ) : null}

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : units.length === 0 ? (
        <EmptyState
          title="Belum ada satuan"
          description="Tambahkan satuan dasar (kg, pcs, liter) sebelum input produk dan konversi beli/jual."
          actionHref="/master/products"
          actionLabel="Ke Master Produk"
        />
      ) : (
        <div style={cardStyle({ padding: 0, overflow: 'hidden' })}>
          <table style={tableStyles.table}>
            <thead>
              <tr>
                <th style={tableStyles.th}>Nama</th>
                <th style={tableStyles.th}>Simbol</th>
                <th style={tableStyles.th}>Pemakaian</th>
                {canEdit ? <th style={{ ...tableStyles.th, textAlign: 'right' }}>Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((unit) => (
                <tr key={unit.id}>
                  {editingId === unit.id ? (
                    <>
                      <td style={tableStyles.td} colSpan={canEdit ? 3 : 2}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                          <Input label="Nama" value={editName} onChange={(e) => setEditName(e.target.value)} fullWidth disabled={saving} />
                          <Input label="Simbol" value={editSymbol} onChange={(e) => setEditSymbol(e.target.value)} fullWidth disabled={saving} />
                        </div>
                      </td>
                      <td style={{ ...tableStyles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <Button type="button" disabled={saving || !editName.trim() || !editSymbol.trim()} onClick={() => void handleUpdate(unit.id)}>
                            Simpan
                          </Button>
                          <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                            Batal
                          </Button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={tableStyles.td}>
                        <strong>{unit.name}</strong>
                      </td>
                      <td style={tableStyles.td}>
                        <code style={{ fontSize: '0.875rem' }}>{unit.symbol}</code>
                      </td>
                      <td style={{ ...tableStyles.td, color: '#64748b', fontSize: '0.875rem' }}>{usageLabel(unit)}</td>
                      {canEdit ? (
                        <td style={{ ...tableStyles.td, textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" disabled={!!deletingId || saving} onClick={() => startEdit(unit)}>
                              Ubah
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={deletingId === unit.id || saving}
                              onClick={() => void handleDelete(unit)}
                            >
                              {deletingId === unit.id ? 'Menghapus…' : 'Hapus'}
                            </Button>
                          </div>
                        </td>
                      ) : null}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '0 1rem 1rem' }}>
            <TablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </div>
        </div>
      )}

      {!loading && units.length > 0 ? (
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#64748b' }}>
          Untuk mengatur <strong>satuan beli</strong>, <strong>faktor konversi</strong>, dan <strong>satuan jual</strong> per produk, buka{' '}
          <Link href="/master/products" style={{ color: '#16a34a', fontWeight: 600 }}>
            Master Produk
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
