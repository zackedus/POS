'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { colors } from '@barokah/ui';
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

function formatPhone(phone: string): string {
  if (phone.length >= 10) {
    return `${phone.slice(0, 4)}-${phone.slice(4, 8)}-${phone.slice(8)}`;
  }
  return phone;
}

export default function StoreAccountPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { customer, isLoggedIn, loading: authLoading, refreshProfile, clearSession } = useStoreCustomerAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700 }}>{customer.name}</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
              {formatPhone(customer.phone)}
            </p>
            {customer.email ? (
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
                {customer.email}
              </p>
            ) : null}
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8125rem', fontWeight: 600, color: colors.primary[700] }}>
              {customer.memberCode}
            </p>
          </div>
          <span
            style={{
              flexShrink: 0,
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
        </div>
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
