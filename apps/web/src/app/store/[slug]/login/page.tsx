'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import { getPostAuthRedirectUrl } from '@/lib/store/store-auth-redirect';
import { loginStoreCustomer } from '@/lib/store/store-api';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';

export default function StoreLoginPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const returnUrl = getPostAuthRedirectUrl(slug, searchParams);
  const { setSession } = useStoreCustomerAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await loginStoreCustomer(slug, {
        identifier: identifier.trim(),
        password,
      });
      setSession({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        customer: result.customer,
      });
      if (result.customer.addressCount === 0 && returnUrl.includes('checkout')) {
        router.push(`/store/${slug}/account/addresses?returnUrl=${encodeURIComponent(returnUrl)}`);
        return;
      }
      router.push(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>Masuk</h1>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
        Login dengan nomor HP atau email yang sudah terdaftar.
      </p>

      {error ? (
        <div role="alert" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.75rem' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          No. HP atau email *
          <input
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="08xxxxxxxxxx"
            style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Password *
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}
          />
        </label>
        <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
          {loading ? 'Masuk…' : 'Masuk'}
        </Button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
        Belum punya akun?{' '}
        <Link href={`/store/${slug}/register?redirect=${encodeURIComponent(returnUrl)}`} style={{ color: colors.primary[600] }}>
          Daftar untuk belanja
        </Link>
      </p>
    </div>
  );
}
