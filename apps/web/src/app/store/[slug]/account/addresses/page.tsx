'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import {
  createStoreCustomerAddress,
  deleteStoreCustomerAddress,
  fetchStoreCustomerAddresses,
  updateStoreCustomerAddress,
} from '@/lib/store/store-api';
import type { StoreCustomerAddress } from '@/lib/store/store-customer-auth-context';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';

const LABEL_PRESETS = ['Rumah', 'Kantor', 'Proyek'];

export default function StoreAccountAddressesPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const returnUrl = searchParams.get('returnUrl') ?? `/store/${slug}/products`;
  const isWelcome = searchParams.get('welcome') === '1';
  const { isLoggedIn, accessToken, loading: authLoading, refreshProfile } = useStoreCustomerAuth();

  const [addresses, setAddresses] = useState<StoreCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(isWelcome);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: 'Rumah',
    addressLine1: '',
    province: '',
    city: '',
    addressLine2: '',
    postalCode: '',
    isDefault: false,
  });
  const [saving, setSaving] = useState(false);

  const loadAddresses = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchStoreCustomerAddresses(slug, accessToken);
      setAddresses(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat alamat.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, slug]);

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/store/${slug}/login?returnUrl=${encodeURIComponent(`/store/${slug}/account/addresses`)}`);
      return;
    }
    void loadAddresses();
  }, [authLoading, isLoggedIn, loadAddresses, router, slug]);

  function resetForm() {
    setForm({
      label: 'Rumah',
      addressLine1: '',
      province: '',
      city: '',
      addressLine2: '',
      postalCode: '',
      isDefault: addresses.length === 0,
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(row: StoreCustomerAddress) {
    setEditingId(row.id);
    setForm({
      label: row.label,
      addressLine1: row.addressLine1,
      province: row.province ?? '',
      city: row.city,
      addressLine2: row.addressLine2 ?? '',
      postalCode: row.postalCode ?? '',
      isDefault: row.isDefault,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        label: form.label.trim(),
        addressLine1: form.addressLine1.trim(),
        province: form.province.trim() || undefined,
        city: form.city.trim(),
        addressLine2: form.addressLine2.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        isDefault: form.isDefault,
      };
      if (editingId) {
        await updateStoreCustomerAddress(slug, accessToken, editingId, payload);
      } else {
        await createStoreCustomerAddress(slug, accessToken, payload);
      }
      await loadAddresses();
      await refreshProfile();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan alamat.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(addressId: string) {
    if (!accessToken || !confirm('Hapus alamat ini?')) return;
    try {
      await deleteStoreCustomerAddress(slug, accessToken, addressId);
      await loadAddresses();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus alamat.');
    }
  }

  if (authLoading || loading) {
    return <div style={{ padding: '1rem' }}>Memuat alamat…</div>;
  }

  return (
    <div style={{ padding: '1rem', paddingBottom: 100 }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>Alamat Pengiriman</h1>
      {isWelcome ? (
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
          Langkah 2 dari 3: tambahkan minimal satu alamat sebelum checkout.
        </p>
      ) : null}

      {error ? (
        <div role="alert" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      {addresses.length === 0 && !showForm ? (
        <div style={{ padding: '1.5rem 1rem', textAlign: 'center', borderRadius: 8, border: `1px dashed ${colors.light.border.default}`, marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.9375rem' }}>Belum ada alamat — tambah alamat pengiriman</p>
          <Button onClick={() => setShowForm(true)}>+ Tambah alamat</Button>
        </div>
      ) : null}

      {addresses.map((row) => (
        <div key={row.id} style={{ marginBottom: '0.75rem', padding: '0.75rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
            <div>
              <strong>{row.label}</strong>
              {row.isDefault ? (
                <span style={{ marginLeft: 8, fontSize: '0.6875rem', background: colors.primary[50], color: colors.primary[700], padding: '2px 6px', borderRadius: 4 }}>
                  Utama
                </span>
              ) : null}
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                {row.addressLine1}
                {row.province ? `, Kec. ${row.province}` : ''}
                <br />
                {row.city}
                {row.postalCode ? ` ${row.postalCode}` : ''}
                {row.addressLine2 ? <><br />{row.addressLine2}</> : null}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button type="button" onClick={() => startEdit(row)} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: colors.primary[600], cursor: 'pointer' }}>
                Edit
              </button>
              <button type="button" onClick={() => void handleDelete(row.id)} style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: colors.semantic.error, cursor: 'pointer' }}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      ))}

      {addresses.length > 0 && !showForm ? (
        <Button variant="secondary" fullWidth onClick={() => { setShowForm(true); setEditingId(null); }}>
          + Tambah alamat
        </Button>
      ) : null}

      {showForm ? (
        <form onSubmit={(e) => void handleSubmit(e)} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Label *
            <select value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}>
              {LABEL_PRESETS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Alamat lengkap *
            <input required minLength={5} value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} placeholder="Jl. … No. …" style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Kecamatan *
            <input required value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Kota/Kabupaten *
            <input required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Kode pos (opsional)
            <input value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
            Catatan (opsional)
            <input value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} placeholder="Patokan, lantai, dll." style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
            Jadikan alamat utama
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan alamat'}</Button>
            <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>
          </div>
        </form>
      ) : null}

      {addresses.length > 0 ? (
        <div style={{ marginTop: '1.25rem' }}>
          <Button fullWidth onClick={() => router.push(returnUrl)}>
            Lanjut belanja / checkout
          </Button>
        </div>
      ) : null}
    </div>
  );
}
