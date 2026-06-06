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
  TablePagination,
  tableStyles,
  useClientPagination,
} from '@/components/dashboard/dashboard-ui';
import { fetchMe, type AuthUser } from '@/lib/auth';
import { fetchOutlets } from '@/lib/reports';
import { canManageUsers } from '@/lib/rbac';
import {
  createUser,
  deactivateUser,
  fetchUsers,
  updateUser,
  USER_ROLE_LABELS,
  type UserSummary,
} from '@/lib/users-api';

const ASSIGNABLE_ROLES = ['MANAGER', 'CASHIER', 'INVENTORY', 'ACCOUNTANT'] as const;

type UserFormState = {
  email: string;
  password: string;
  fullName: string;
  role: string;
  outletIds: string[];
};

const emptyCreateForm: UserFormState = {
  email: '',
  password: '',
  fullName: '',
  role: 'CASHIER',
  outletIds: [],
};

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [outletOptions, setOutletOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyCreateForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'CASHIER',
    outletIds: [] as string[],
    password: '',
  });

  const canEdit = currentUser ? canManageUsers(currentUser.role) : false;
  const { page, totalPages, pageItems, setPage, totalItems, pageSize } = useClientPagination(users, 8);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [me, rows, outletsRes] = await Promise.all([fetchMe(), fetchUsers(), fetchOutlets()]);
      setCurrentUser(me);
      setUsers(rows);
      const outlets = outletsRes?.outlets ?? [];
      setOutletOptions(outlets.map((o) => ({ id: o.id, label: `${o.name} (${o.code})` })));
      if (outlets.length === 1) {
        setForm((prev) => ({ ...prev, outletIds: [outlets[0]!.id] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function startEdit(user: UserSummary) {
    setEditingId(user.id);
    setEditForm({
      fullName: user.fullName,
      role: user.role,
      outletIds: user.outlets.map((o) => o.id),
      password: '',
    });
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ fullName: '', role: 'CASHIER', outletIds: [], password: '' });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await createUser(form);
      setSuccess('Pengguna baru berhasil dibuat.');
      setForm({ ...emptyCreateForm, outletIds: form.outletIds });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(userId: string) {
    if (!canEdit || !editForm.fullName.trim() || editForm.outletIds.length === 0) {
      setError('Nama lengkap dan minimal satu outlet wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateUser(userId, {
        fullName: editForm.fullName.trim(),
        role: editForm.role,
        outletIds: editForm.outletIds,
        ...(editForm.password.trim() ? { password: editForm.password.trim() } : {}),
      });
      setSuccess('Data pengguna berhasil diperbarui.');
      cancelEdit();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserSummary) {
    if (!canEdit || user.role === 'OWNER') return;

    setError(null);
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
        setSuccess(`Pengguna ${user.fullName} dinonaktifkan.`);
      } else {
        await updateUser(user.id, { isActive: true });
        setSuccess(`Pengguna ${user.fullName} diaktifkan kembali.`);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status pengguna.');
    }
  }

  function renderOutletFieldset(
    selectedIds: string[],
    onChange: (ids: string[]) => void,
    disabled: boolean,
  ) {
    return (
      <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '0.75rem', margin: 0 }}>
        <legend style={{ fontSize: '0.875rem', padding: '0 0.25rem' }}>Akses outlet</legend>
        {outletOptions.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Tidak ada outlet.</p>
        ) : (
          outletOptions.map((outlet) => (
            <label key={outlet.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                disabled={disabled}
                checked={selectedIds.includes(outlet.id)}
                onChange={(e) => {
                  onChange(
                    e.target.checked
                      ? [...selectedIds, outlet.id]
                      : selectedIds.filter((id) => id !== outlet.id),
                  );
                }}
              />
              {outlet.label}
            </label>
          ))
        )}
      </fieldset>
    );
  }

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Manajemen Pengguna"
        description="Kelola akun staff tenant. Pemilik dapat menambah, mengubah, dan menonaktifkan pengguna."
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadData()} disabled={loading}>
            Muat ulang
          </Button>
        }
      />

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <section style={cardStyle()}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Daftar Pengguna</h3>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : users.length === 0 ? (
          <EmptyState
            title="Belum ada pengguna staff"
            description="Tambahkan akun kasir atau manajer untuk mulai operasional."
            actionHref="#tambah-pengguna"
            actionLabel="Tambah pengguna"
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyles.table}>
                <thead>
                  <tr style={tableStyles.headRow}>
                    <th style={tableStyles.th}>Nama</th>
                    <th style={tableStyles.th}>Email</th>
                    <th style={tableStyles.th}>Role</th>
                    <th style={tableStyles.th}>Outlet</th>
                    <th style={tableStyles.th}>Status</th>
                    {canEdit ? <th style={tableStyles.th}>Aksi</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((user) =>
                    editingId === user.id ? (
                      <tr key={user.id} style={tableStyles.row}>
                        <td colSpan={canEdit ? 6 : 5} style={{ ...tableStyles.td, padding: '1rem' }}>
                          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 520 }}>
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                              Nama lengkap
                              <input
                                required
                                value={editForm.fullName}
                                onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                              />
                            </label>
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                              Role
                              <select
                                value={editForm.role}
                                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                                disabled={user.role === 'OWNER'}
                                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                              >
                                {user.role === 'OWNER' ? (
                                  <option value="OWNER">{USER_ROLE_LABELS.OWNER}</option>
                                ) : (
                                  ASSIGNABLE_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                      {USER_ROLE_LABELS[role]}
                                    </option>
                                  ))
                                )}
                              </select>
                            </label>
                            {renderOutletFieldset(editForm.outletIds, (ids) => setEditForm((p) => ({ ...p, outletIds: ids })), saving)}
                            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
                              Password baru (opsional)
                              <input
                                type="password"
                                minLength={8}
                                value={editForm.password}
                                onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                                placeholder="Kosongkan jika tidak diubah"
                                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
                              />
                            </label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <Button type="button" variant="primary" disabled={saving} onClick={() => void handleUpdate(user.id)}>
                                {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                              </Button>
                              <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                                Batal
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={user.id} style={tableStyles.row}>
                        <td style={tableStyles.td}>{user.fullName}</td>
                        <td style={tableStyles.td}>{user.email}</td>
                        <td style={tableStyles.td}>{USER_ROLE_LABELS[user.role] ?? user.role}</td>
                        <td style={tableStyles.td}>{user.outlets.map((o) => o.name).join(', ') || '—'}</td>
                        <td style={tableStyles.td}>
                          <StatusBadge label={user.isActive ? 'Aktif' : 'Nonaktif'} variant={user.isActive ? 'success' : 'neutral'} />
                        </td>
                        {canEdit ? (
                          <td style={tableStyles.td}>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {user.role !== 'OWNER' && user.id !== currentUser?.id ? (
                                <>
                                  <Button type="button" variant="secondary" onClick={() => startEdit(user)}>
                                    Ubah
                                  </Button>
                                  <Button type="button" variant="ghost" onClick={() => void toggleActive(user)}>
                                    {user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                  </Button>
                                </>
                              ) : (
                                '—'
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </section>

      {canEdit ? (
        <section id="tambah-pengguna" style={cardStyle()}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem' }}>Tambah Pengguna Baru</h3>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Nama lengkap
              <input
                required
                value={form.fullName}
                onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Password sementara
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Role
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                style={{ padding: '0.5rem', borderRadius: 8, border: '1px solid #e2e8f0' }}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {USER_ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </label>
            {renderOutletFieldset(form.outletIds, (ids) => setForm((p) => ({ ...p, outletIds: ids })), saving)}
            <Button type="submit" variant="primary" disabled={saving || form.outletIds.length === 0}>
              {saving ? 'Menyimpan…' : 'Buat Pengguna'}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
