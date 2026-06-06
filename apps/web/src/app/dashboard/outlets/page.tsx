'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  StatusBadge,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { inputStyle } from '@/components/dashboard/settings/settings-ui';
import {
  useCreateOutletMutation,
  useOutletDetailQuery,
  useOutletsQuery,
  useSetDefaultOutletMutation,
  useUpdateOutletMutation,
  type OutletRecord,
} from '@/hooks/useOutlets';
import { fetchMe } from '@/lib/auth';
import { mapApiError } from '@/lib/api-client';
import { canManageOutlets } from '@/lib/rbac';
import { initOutletSelection } from '@/lib/outlet-selection-state';

type FormState = {
  name: string;
  code: string;
  address: string;
  phone: string;
  operatingHours: string;
};

const emptyForm: FormState = {
  name: '',
  code: '',
  address: '',
  phone: '',
  operatingHours: '',
};

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: 'Pemilik',
    MANAGER: 'Manager',
    CASHIER: 'Kasir',
    INVENTORY: 'Stok',
    ACCOUNTANT: 'Akuntan',
  };
  return labels[role] ?? role;
}

export default function OutletsPage() {
  const [canManage, setCanManage] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<OutletRecord | null>(null);
  const [detailOutletId, setDetailOutletId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [toast, setToast] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);

  const outletsQuery = useOutletsQuery(showInactive && canManage);
  const detailQuery = useOutletDetailQuery(detailOutletId);
  const createMutation = useCreateOutletMutation();
  const updateMutation = useUpdateOutletMutation();
  const defaultMutation = useSetDefaultOutletMutation();

  useEffect(() => {
    void fetchMe().then((me) => setCanManage(canManageOutlets(me.role)));
  }, []);

  useEffect(() => {
    if (outletsQuery.data) {
      initOutletSelection(outletsQuery.data);
    }
  }, [outletsQuery.data]);

  const outlets = outletsQuery.data?.outlets ?? [];
  const saving =
    createMutation.isPending || updateMutation.isPending || defaultMutation.isPending;

  function resetForm() {
    setForm(emptyForm);
    setShowCreate(false);
    setEditingOutlet(null);
  }

  function openEdit(outlet: OutletRecord) {
    setEditingOutlet(outlet);
    setShowCreate(false);
    setForm({
      name: outlet.name,
      code: outlet.code,
      address: outlet.address ?? '',
      phone: outlet.phone ?? '',
      operatingHours: outlet.operatingHours ?? '',
    });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setToast(null);
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        operatingHours: form.operatingHours.trim() || undefined,
      });
      resetForm();
      setToast({ variant: 'success', message: 'Cabang baru berhasil ditambahkan.' });
    } catch (err) {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal menambahkan cabang.') });
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingOutlet) return;
    setToast(null);
    try {
      await updateMutation.mutateAsync({
        outletId: editingOutlet.id,
        body: {
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          operatingHours: form.operatingHours.trim() || null,
        },
      });
      resetForm();
      setToast({ variant: 'success', message: 'Data cabang berhasil diperbarui.' });
    } catch (err) {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal memperbarui cabang.') });
    }
  }

  async function handleToggleActive(outlet: OutletRecord) {
    const nextActive = !outlet.isActive;
    const confirmed = window.confirm(
      nextActive
        ? `Aktifkan kembali cabang "${outlet.name}"?`
        : `Nonaktifkan cabang "${outlet.name}"? Kasir tidak bisa memilih cabang ini.`,
    );
    if (!confirmed) return;

    setToast(null);
    try {
      await updateMutation.mutateAsync({
        outletId: outlet.id,
        body: { isActive: nextActive },
      });
      if (detailOutletId === outlet.id && !nextActive) {
        setDetailOutletId(null);
      }
      setToast({
        variant: 'success',
        message: nextActive ? 'Cabang diaktifkan.' : 'Cabang dinonaktifkan.',
      });
    } catch (err) {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal mengubah status cabang.') });
    }
  }

  async function handleSetDefault(outlet: OutletRecord) {
    if (outlet.isDefault) return;
    setToast(null);
    try {
      await defaultMutation.mutateAsync(outlet.id);
      setToast({ variant: 'success', message: `"${outlet.name}" ditetapkan sebagai cabang utama.` });
    } catch (err) {
      setToast({ variant: 'error', message: mapApiError(err, 'Gagal menetapkan cabang utama.') });
    }
  }

  const formTitle = editingOutlet ? 'Ubah Cabang' : 'Tambah Cabang Baru';
  const showForm = canManage && (showCreate || editingOutlet);

  return (
    <div style={{ maxWidth: 1080, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Manajemen Cabang"
        description="Kelola outlet/toko fisik. Stok, shift, dan laporan terpisah per cabang."
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/dashboard/store" style={{ textDecoration: 'none' }}>
              <Button type="button" variant="secondary">
                Profil Toko
              </Button>
            </Link>
            {canManage ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  resetForm();
                  setShowCreate(true);
                }}
              >
                + Cabang Baru
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void outletsQuery.refetch()}
              disabled={outletsQuery.isFetching}
            >
              Muat ulang
            </Button>
          </div>
        }
      />

      {toast ? <AlertBanner variant={toast.variant}>{toast.message}</AlertBanner> : null}
      {outletsQuery.error ? (
        <AlertBanner variant="error">{mapApiError(outletsQuery.error, 'Gagal memuat cabang.')}</AlertBanner>
      ) : null}

      {showForm ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>{formTitle}</h3>
          <form
            onSubmit={(e) => void (editingOutlet ? handleUpdate(e) : handleCreate(e))}
            style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}
          >
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Nama cabang
              <input
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={120}
                style={inputStyle()}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Kode (unik, huruf besar)
              <input
                required
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                maxLength={20}
                pattern="[A-Z0-9_-]+"
                placeholder="NORTH"
                style={{ ...inputStyle(), fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Alamat
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                maxLength={300}
                style={inputStyle()}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Telepon
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={20}
                placeholder="021-5551234"
                style={inputStyle()}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Jam operasional
              <input
                value={form.operatingHours}
                onChange={(e) => setForm((prev) => ({ ...prev, operatingHours: e.target.value }))}
                maxLength={120}
                placeholder="Sen–Sab 08:00–17:00"
                style={inputStyle()}
              />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Menyimpan…' : editingOutlet ? 'Simpan Perubahan' : 'Tambah Cabang'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: detailOutletId ? '1fr minmax(280px, 360px)' : '1fr',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        <section style={cardStyle()}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Daftar Cabang</h3>
            {canManage ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Tampilkan nonaktif
              </label>
            ) : null}
          </div>

          {outletsQuery.isLoading ? (
            <LoadingSkeleton rows={4} />
          ) : outlets.length === 0 ? (
            <EmptyState title="Belum ada cabang" description="Tambahkan cabang pertama untuk operasi multi-outlet." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyles.table}>
                <thead>
                  <tr style={tableStyles.headRow}>
                    <th style={tableStyles.th}>Nama</th>
                    <th style={tableStyles.th}>Kode</th>
                    <th style={tableStyles.th}>Kontak</th>
                    <th style={tableStyles.th}>Stok</th>
                    <th style={tableStyles.th}>Status</th>
                    <th style={tableStyles.th}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {outlets.map((outlet) => (
                    <tr key={outlet.id} style={tableStyles.row}>
                      <td style={tableStyles.td}>
                        <span style={{ fontWeight: outlet.isDefault ? 600 : 400 }}>
                          {outlet.isDefault ? '★ ' : ''}
                          {outlet.name}
                        </span>
                      </td>
                      <td style={{ ...tableStyles.td, fontFamily: 'monospace' }}>{outlet.code}</td>
                      <td style={{ ...tableStyles.td, color: '#64748b', fontSize: '0.8125rem' }}>
                        {outlet.phone ?? '—'}
                        {outlet.operatingHours ? (
                          <div style={{ marginTop: 2 }}>{outlet.operatingHours}</div>
                        ) : null}
                      </td>
                      <td style={tableStyles.td}>
                        <Link href="/dashboard/inventory" style={{ color: '#2563eb', fontSize: '0.8125rem' }}>
                          {outlet.inventorySkuCount ?? 0} SKU
                        </Link>
                      </td>
                      <td style={tableStyles.td}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <StatusBadge
                            label={outlet.isActive ? 'Aktif' : 'Nonaktif'}
                            variant={outlet.isActive ? 'success' : 'warning'}
                          />
                          {outlet.isDefault ? <StatusBadge label="Utama" variant="info" /> : null}
                        </div>
                      </td>
                      <td style={tableStyles.td}>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <Button
                            type="button"
                            variant={detailOutletId === outlet.id ? 'primary' : 'secondary'}
                            onClick={() =>
                              setDetailOutletId(detailOutletId === outlet.id ? null : outlet.id)
                            }
                          >
                            Detail
                          </Button>
                          {canManage ? (
                            <>
                              <Button type="button" variant="secondary" disabled={saving} onClick={() => openEdit(outlet)}>
                                Ubah
                              </Button>
                              {!outlet.isDefault && outlet.isActive ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  disabled={saving}
                                  onClick={() => void handleSetDefault(outlet)}
                                >
                                  Jadikan utama
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => void handleToggleActive(outlet)}
                              >
                                {outlet.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
            Assign kasir ke cabang via menu{' '}
            <Link href="/dashboard/users" style={{ color: '#2563eb' }}>
              Pengguna
            </Link>
            . Transfer stok antar cabang di{' '}
            <Link href="/dashboard/inventory" style={{ color: '#2563eb' }}>
              Inventori → Transfer
            </Link>
            .
          </p>
        </section>

        {detailOutletId ? (
          <aside style={cardStyle()}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Detail Cabang</h3>
            {detailQuery.isLoading ? (
              <LoadingSkeleton rows={6} />
            ) : detailQuery.data ? (
              <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <strong>{detailQuery.data.name}</strong>
                  <div style={{ color: '#64748b', fontFamily: 'monospace' }}>{detailQuery.data.code}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>Alamat</div>
                  {detailQuery.data.address ?? '—'}
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>Telepon</div>
                  {detailQuery.data.phone ?? '—'}
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>Jam operasional</div>
                  {detailQuery.data.operatingHours ?? '—'}
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem' }}>Ringkasan stok</div>
                  {detailQuery.data.stockSummary.skuCount} SKU · total qty{' '}
                  {detailQuery.data.stockSummary.totalQuantity}
                  {detailQuery.data.stockSummary.lowStockCount > 0 ? (
                    <span style={{ color: '#b45309' }}>
                      {' '}
                      · {detailQuery.data.stockSummary.lowStockCount} di bawah min
                    </span>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link href="/dashboard/inventory">
                    <Button type="button" variant="secondary">
                      Lihat Stok
                    </Button>
                  </Link>
                  <Link href="/dashboard/inventory">
                    <Button type="button" variant="ghost">
                      Transfer
                    </Button>
                  </Link>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.8125rem', marginBottom: 4 }}>
                    Pengguna ter-assign ({detailQuery.data.assignedUsers.length})
                  </div>
                  {detailQuery.data.assignedUsers.length === 0 ? (
                    <span style={{ color: '#64748b' }}>Belum ada — atur di Pengguna.</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {detailQuery.data.assignedUsers.map((user) => (
                        <li key={user.id}>
                          {user.fullName} · {roleLabel(user.role)}
                          {!user.isActive ? ' (nonaktif)' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState title="Detail tidak tersedia" description="Gagal memuat detail cabang." />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
