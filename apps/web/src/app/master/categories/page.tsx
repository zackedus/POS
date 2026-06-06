'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button, Input } from '@barokah/ui';
import { apiConfig, toUserFacingError } from '@/lib/api';
import { authFetch } from '@/lib/auth';

interface Category {
  id: string;
  name: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

const pageStyle = { maxWidth: '900px' } as const;
const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  background: '#ffffff',
  padding: '1rem',
} as const;
const stateBoxStyle = { marginBottom: '0.75rem', borderRadius: '10px', padding: '0.75rem 0.875rem' } as const;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadCategories() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories`);
      const json = (await res.json()) as ApiEnvelope<Category[]>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal memuat data kategori.');
      }
      setCategories(json.data);
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const json = (await res.json()) as ApiEnvelope<Category>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal menambahkan kategori.');
      }
      setName('');
      await loadCategories();
      setSuccess('Kategori baru berhasil ditambahkan.');
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function handleUpdate(categoryId: string) {
    if (!editName.trim()) {
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = (await res.json()) as ApiEnvelope<Category>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal memperbarui kategori.');
      }
      cancelEdit();
      await loadCategories();
      setSuccess('Perubahan kategori berhasil disimpan.');
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`Hapus kategori "${category.name}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) {
      return;
    }
    setDeletingId(category.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories/${category.id}`, {
        method: 'DELETE',
      });
      const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Gagal menghapus kategori.');
      }
      if (editingId === category.id) {
        cancelEdit();
      }
      await loadCategories();
      setSuccess(`Kategori "${category.name}" berhasil dihapus.`);
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  return (
    <main style={pageStyle}>
      <h1 style={{ marginBottom: '0.5rem' }}>Master Kategori</h1>
      <p style={{ color: '#64748b', marginTop: 0, marginBottom: '1rem' }}>
        Kelola kategori bahan bangunan untuk katalog produk.
      </p>

      <section style={{ ...cardStyle, marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Tambah Kategori Baru</h2>
        <p style={{ margin: '0.4rem 0 1rem', color: '#64748b', fontSize: '0.9rem' }}>
          Gunakan nama kategori yang singkat agar mudah dicari kasir.
        </p>

        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.75rem' }}>
          <Input
            label="Nama kategori"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Semen"
            fullWidth
            disabled={saving}
          />
          <div style={{ alignSelf: 'end' }}>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Menyimpan...' : 'Tambah'}
            </Button>
          </div>
        </form>
      </section>

      {error ? (
        <div style={{ ...stateBoxStyle, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}>
          <strong>Gagal memproses data kategori.</strong>
          <p style={{ margin: '0.35rem 0 0' }}>{error}</p>
          <Button type="button" variant="secondary" onClick={() => void loadCategories()} style={{ marginTop: '0.75rem' }}>
            Coba muat ulang
          </Button>
        </div>
      ) : null}
      {success ? (
        <div style={{ ...stateBoxStyle, color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          {success}
        </div>
      ) : null}
      {loading ? (
        <div style={{ ...stateBoxStyle, color: '#1e3a8a', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          Memuat kategori dari server...
        </div>
      ) : null}

      <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {categories.length === 0 ? (
          <p style={{ padding: '1rem', margin: 0, color: '#64748b' }}>
            Belum ada kategori. Tambahkan kategori pertama untuk membantu klasifikasi produk.
          </p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid #f1f5f9',
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                justifyContent: 'space-between',
              }}
            >
              {editingId === category.id ? (
                <>
                  <Input
                    label="Ubah nama"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    fullWidth
                    disabled={saving}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <Button type="button" disabled={saving || !editName.trim()} onClick={() => void handleUpdate(category.id)}>
                      Simpan
                    </Button>
                    <Button type="button" variant="secondary" disabled={saving} onClick={cancelEdit}>
                      Batal
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <span>{category.name}</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <Button type="button" variant="secondary" disabled={!!deletingId || saving} onClick={() => startEdit(category)}>
                      Ubah
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={deletingId === category.id || saving}
                      onClick={() => void handleDelete(category)}
                    >
                      {deletingId === category.id ? 'Menghapus...' : 'Hapus'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}
