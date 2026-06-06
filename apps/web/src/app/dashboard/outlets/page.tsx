'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
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
import { fetchMe } from '@/lib/auth';
import { createOutlet, fetchOutletsList, updateOutlet, type OutletRecord } from '@/lib/outlets-api';
import { mapApiError } from '@/lib/api-client';
import { canManageOutlets } from '@/lib/rbac';
import { initOutletSelection } from '@/lib/outlet-selection-state';

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<OutletRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const loadOutlets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMe();
      setCanManage(canManageOutlets(me.role));
      const data = await fetchOutletsList(showInactive && canManageOutlets(me.role));
      setOutlets(data.outlets);
      initOutletSelection(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat cabang.'));
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    void loadOutlets();
  }, [loadOutlets]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createOutlet({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        address: formAddress.trim() || undefined,
      });
      setFormName('');
      setFormCode('');
      setFormAddress('');
      setSuccess('Cabang baru berhasil ditambahkan.');
      await loadOutlets();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menambahkan cabang.'));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(outlet: OutletRecord) {
    setEditingId(outlet.id);
    setEditName(outlet.name);
    setEditCode(outlet.code);
    setEditAddress(outlet.address ?? '');
  }

  async function handleUpdate(outletId: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateOutlet(outletId, {
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        address: editAddress.trim() || null,
      });
      setEditingId(null);
      setSuccess('Data cabang berhasil diperbarui.');
      await loadOutlets();
    } catch (err) {
      setError(mapApiError(err, 'Gagal memperbarui cabang.'));
    } finally {
      setSaving(false);
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

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateOutlet(outlet.id, { isActive: nextActive });
      setSuccess(nextActive ? 'Cabang diaktifkan.' : 'Cabang dinonaktifkan.');
      await loadOutlets();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mengubah status cabang.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 960, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Manajemen Cabang"
        description="Kelola outlet/toko fisik. Stok, shift, dan laporan terpisah per cabang."
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadOutlets()} disabled={loading}>
            Muat ulang
          </Button>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {canManage ? (
        <section style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Tambah Cabang Baru</h3>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Nama cabang
              <input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={120}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Kode (unik, huruf besar)
              <input
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                maxLength={20}
                pattern="[A-Z0-9_-]+"
                placeholder="NORTH"
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Alamat (opsional)
              <input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                maxLength={300}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Menyimpan…' : 'Tambah Cabang'}
            </Button>
          </form>
        </section>
      ) : null}

      <section style={cardStyle()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Daftar Cabang</h3>
          {canManage ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Tampilkan nonaktif
            </label>
          ) : null}
        </div>

        {loading ? (
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
                  <th style={tableStyles.th}>Alamat</th>
                  <th style={tableStyles.th}>Status</th>
                  {canManage ? <th style={tableStyles.th}>Aksi</th> : null}
                </tr>
              </thead>
              <tbody>
                {outlets.map((outlet) => (
                  <tr key={outlet.id} style={tableStyles.row}>
                    {editingId === outlet.id ? (
                      <>
                        <td style={tableStyles.td} colSpan={canManage ? 5 : 4}>
                          <div style={{ display: 'grid', gap: '0.5rem', maxWidth: 480 }}>
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            />
                            <input
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                              style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid #e2e8f0', fontFamily: 'monospace' }}
                            />
                            <input
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                              placeholder="Alamat"
                              style={{ padding: '0.4rem', borderRadius: 6, border: '1px solid #e2e8f0' }}
                            />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button type="button" variant="primary" disabled={saving} onClick={() => void handleUpdate(outlet.id)}>
                                Simpan
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                                Batal
                              </Button>
                            </div>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tableStyles.td}>{outlet.name}</td>
                        <td style={{ ...tableStyles.td, fontFamily: 'monospace' }}>{outlet.code}</td>
                        <td style={{ ...tableStyles.td, color: '#64748b' }}>{outlet.address ?? '—'}</td>
                        <td style={tableStyles.td}>
                          <StatusBadge
                            label={outlet.isActive ? 'Aktif' : 'Nonaktif'}
                            variant={outlet.isActive ? 'success' : 'warning'}
                          />
                        </td>
                        {canManage ? (
                          <td style={tableStyles.td}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <Button type="button" variant="secondary" disabled={saving} onClick={() => startEdit(outlet)}>
                                Ubah
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                disabled={saving}
                                onClick={() => void handleToggleActive(outlet)}
                              >
                                {outlet.isActive ? 'Nonaktifkan' : 'Aktifkan'}
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
          </div>
        )}
        <p style={{ margin: '1rem 0 0', fontSize: '0.8125rem', color: '#64748b' }}>
          Pilih cabang aktif di header untuk modul stok, laporan, dan order distributor. Assign kasir ke cabang via menu
          Pengguna.
        </p>
      </section>
    </div>
  );
}
