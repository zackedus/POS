'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatPhoneDisplay, isValidIndonesianMobilePhone } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { updateStoreCustomerMe } from '@/lib/store/store-api';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  minHeight: 52,
  padding: '0.75rem 1rem',
  borderRadius: 10,
  border: `1px solid ${colors.light.border.default}`,
  background: colors.light.bg.base,
  textDecoration: 'none',
  color: colors.light.text.primary,
  fontSize: '0.9375rem',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '0.65rem',
  borderRadius: 8,
  border: `1px solid ${colors.light.border.default}`,
};

function fieldErrorStyle(hasError: boolean): React.CSSProperties {
  return hasError ? { borderColor: colors.semantic.error } : {};
}

export default function StoreAccountPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const {
    customer,
    accessToken,
    isLoggedIn,
    loading: authLoading,
    refreshProfile,
    clearSession,
  } = useStoreCustomerAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      router.replace(`/store/${slug}/login?redirect=${encodeURIComponent(`/store/${slug}/account`)}`);
      return;
    }

    setProfileLoading(true);
    setError(null);
    void refreshProfile()
      .catch((err: unknown) => {
        const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
        if (code === 'UNAUTHORIZED' || code === 'INVALID_CREDENTIALS') {
          clearSession();
          router.replace(`/store/${slug}/login?redirect=${encodeURIComponent(`/store/${slug}/account`)}`);
          return;
        }
        setError(err instanceof Error ? err.message : 'Gagal memuat profil.');
      })
      .finally(() => setProfileLoading(false));
  }, [authLoading, isLoggedIn, refreshProfile, clearSession, router, slug]);

  useEffect(() => {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      name: customer.name,
      phone: formatPhoneDisplay(customer.phone),
      email: customer.email ?? '',
    }));
  }, [customer]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function resetProfileForm() {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      name: customer.name,
      phone: formatPhoneDisplay(customer.phone),
      email: customer.email ?? '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
    setFieldErrors({});
    setEditingProfile(false);
    setShowPasswordForm(false);
  }

  function validateProfileForm(): boolean {
    const next: Record<string, string> = {};
    const name = form.name.trim();
    if (name.length < 2) {
      next.name = 'Nama minimal 2 karakter.';
    }
    const phone = form.phone.trim();
    if (!phone) {
      next.phone = 'No. HP wajib diisi.';
    } else if (!isValidIndonesianMobilePhone(phone)) {
      next.phone = 'No. HP harus format Indonesia (08… atau 62…).';
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Email tidak valid.';
    }
    if (showPasswordForm) {
      if (!form.currentPassword) {
        next.currentPassword = 'Password saat ini wajib diisi.';
      }
      if (!form.newPassword) {
        next.newPassword = 'Password baru wajib diisi.';
      } else if (form.newPassword.length < 8) {
        next.newPassword = 'Password baru minimal 8 karakter.';
      }
      if (form.newPassword !== form.confirmPassword) {
        next.confirmPassword = 'Konfirmasi password tidak cocok.';
      }
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !customer) return;
    if (!validateProfileForm()) return;

    setSaving(true);
    setError(null);
    try {
      const payload: {
        name?: string;
        email?: string;
        phone?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};

      const trimmedName = form.name.trim();
      const trimmedPhone = form.phone.trim();
      const trimmedEmail = form.email.trim();

      if (trimmedName !== customer.name) payload.name = trimmedName;
      if (trimmedPhone !== formatPhoneDisplay(customer.phone)) payload.phone = trimmedPhone;
      if (trimmedEmail !== (customer.email ?? '')) payload.email = trimmedEmail;

      if (showPasswordForm && form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      if (Object.keys(payload).length === 0) {
        setToast('Tidak ada perubahan.');
        setEditingProfile(false);
        setShowPasswordForm(false);
        return;
      }

      await updateStoreCustomerMe(slug, accessToken, payload);
      await refreshProfile();
      setToast('Profil berhasil diperbarui.');
      resetProfileForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearSession();
    router.push(`/store/${slug}`);
  }

  if (authLoading || profileLoading) {
    return (
      <div style={{ padding: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>Memuat akun…</p>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div style={{ padding: '1rem', paddingBottom: 100 }}>
      <h1 style={{ margin: '0 0 1rem', fontSize: '1.25rem' }}>Akun Saya</h1>

      {toast ? (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: 8,
            background: colors.primary[50],
            color: colors.primary[700],
            fontSize: '0.875rem',
          }}
        >
          {toast}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: 8,
            background: '#fef2f2',
            color: '#b91c1c',
            fontSize: '0.875rem',
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          marginBottom: '1.25rem',
          padding: '1rem',
          borderRadius: 12,
          border: `1px solid ${colors.light.border.default}`,
          background: colors.primary[50],
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: editingProfile ? '1rem' : 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: colors.light.text.secondary }}>
              Edit profil
            </p>
            {!editingProfile ? (
              <>
                <p style={{ margin: '0.35rem 0 0', fontSize: '1.0625rem', fontWeight: 700 }}>{customer.name}</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                  {formatPhoneDisplay(customer.phone)}
                </p>
                {customer.email ? (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                    {customer.email}
                  </p>
                ) : null}
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: colors.primary[700] }}>
                  {customer.memberCode}
                </p>
              </>
            ) : null}
          </div>
          {!editingProfile ? (
            <button
              type="button"
              onClick={() => setEditingProfile(true)}
              style={{
                flexShrink: 0,
                fontSize: '0.8125rem',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.primary[600]}`,
                background: colors.light.bg.base,
                color: colors.primary[700],
                cursor: 'pointer',
              }}
            >
              Ubah
            </button>
          ) : null}
        </div>

        {editingProfile ? (
          <form onSubmit={(e) => void handleSaveProfile(e)} style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Nama lengkap *
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.name)) }}
              />
              {fieldErrors.name ? (
                <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.name}</span>
              ) : null}
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              No. HP (WhatsApp) *
              <input
                required
                type="tel"
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.phone)) }}
              />
              {fieldErrors.phone ? (
                <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.phone}</span>
              ) : null}
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Email (opsional)
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.email)) }}
              />
              {fieldErrors.email ? (
                <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.email}</span>
              ) : null}
            </label>

            {!showPasswordForm ? (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                style={{
                  justifySelf: 'start',
                  fontSize: '0.8125rem',
                  background: 'none',
                  border: 'none',
                  color: colors.primary[600],
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Ubah password
              </button>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem', paddingTop: '0.25rem', borderTop: `1px dashed ${colors.light.border.default}` }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600 }}>Ubah password</p>
                <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                  Password saat ini *
                  <input
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.currentPassword)) }}
                  />
                  {fieldErrors.currentPassword ? (
                    <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.currentPassword}</span>
                  ) : null}
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                  Password baru *
                  <input
                    type="password"
                    minLength={8}
                    value={form.newPassword}
                    onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                    style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.newPassword)) }}
                  />
                  {fieldErrors.newPassword ? (
                    <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.newPassword}</span>
                  ) : null}
                </label>
                <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
                  Ulangi password baru *
                  <input
                    type="password"
                    minLength={8}
                    value={form.confirmPassword}
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    style={{ ...inputStyle, ...fieldErrorStyle(Boolean(fieldErrors.confirmPassword)) }}
                  />
                  {fieldErrors.confirmPassword ? (
                    <span style={{ color: colors.semantic.error, fontSize: '0.75rem' }}>{fieldErrors.confirmPassword}</span>
                  ) : null}
                </label>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={saving}>
                {saving ? 'Menyimpan…' : 'Simpan profil'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetProfileForm} disabled={saving}>
                Batal
              </Button>
            </div>
          </form>
        ) : (
          <span
            style={{
              display: 'inline-block',
              marginTop: '0.5rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 999,
              background: colors.primary[50],
              color: colors.primary[700],
            }}
          >
            Pelanggan terdaftar
          </span>
        )}
      </section>

      <nav aria-label="Menu akun" style={{ display: 'grid', gap: '0.5rem' }}>
        <Link href={`/store/${slug}/account/addresses`} style={menuItemStyle}>
          <span>Alamat pengiriman</span>
          <span style={{ fontSize: '0.8125rem', color: colors.light.text.secondary }}>
            {customer.addressCount > 0 ? `${customer.addressCount} alamat` : 'Belum ada'}
          </span>
        </Link>
        <Link href={`/store/${slug}/orders`} style={menuItemStyle}>
          <span>Pesanan saya</span>
          <span aria-hidden style={{ color: colors.light.text.secondary }}>›</span>
        </Link>
        <Link href={`/store/${slug}/cart`} style={menuItemStyle}>
          <span>Keranjang</span>
          <span aria-hidden style={{ color: colors.light.text.secondary }}>›</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          style={{
            ...menuItemStyle,
            width: '100%',
            cursor: 'pointer',
            border: `1px solid ${colors.semantic.error}`,
            color: colors.semantic.error,
            background: '#fff5f5',
          }}
        >
          Keluar
        </button>
      </nav>
    </div>
  );
}
