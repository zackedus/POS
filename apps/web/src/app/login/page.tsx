'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { APP_NAME } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import { fetchMe, loginRequest, persistUserRole, syncAuthSessionFromStorage, tokenStorage } from '@/lib/auth';
import { getPostLoginPath } from '@/lib/rbac';
import { useChunkLoadRecovery } from '@/lib/use-chunk-load-recovery';

export default function LoginPage() {
  useChunkLoadRecovery('login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isDisabled = loading || !email.trim() || !password.trim();

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    syncAuthSessionFromStorage();
    let cancelled = false;

    void fetchMe()
      .then((user) => {
        if (!cancelled) {
          persistUserRole(user.role);
          router.replace(getPostLoginPath(user.role));
        }
      })
      .catch(() => {
        tokenStorage.clear();
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await loginRequest({ email: email.trim(), password });
      tokenStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken, data.user.role);
      persistUserRole(data.user.role);
      router.push(getPostLoginPath(data.user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      suppressHydrationWarning
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #0f172a 0%, #14532d 60%, #0f172a 100%)',
        padding: '1.5rem',
      }}
    >
      <div suppressHydrationWarning style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: '#16a34a',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.5rem',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(22,163,74,0.4)',
            }}
            aria-hidden
          >
            B
          </div>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.25rem', color: '#f8fafc' }}>{APP_NAME}</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>
            Masuk ke akun toko — pemilik, manajer, atau kasir
          </p>
        </div>

        <div
          suppressHydrationWarning
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Email kasir"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contoh: kasir@barokah.local"
              required
              fullWidth
              disabled={loading}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              required
              fullWidth
              disabled={loading}
              error={error ?? undefined}
            />
            <Button type="submit" variant="primary" fullWidth disabled={isDisabled} style={{ minHeight: 48, marginTop: '0.25rem' }}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              fontSize: '0.8125rem',
              color: '#166534',
            }}
          >
            <strong>Tips:</strong> Kasir diarahkan ke layar POS, manajer/pemilik ke dashboard admin.
          </div>
        </div>

        <p style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.875rem' }}>
          <Link href="/" style={{ color: '#86efac', textDecoration: 'none' }}>
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </main>
  );
}
