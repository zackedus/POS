'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import { getPostAuthRedirectUrl } from '@/lib/store/store-auth-redirect';
import { registerStoreMember } from '@/lib/store/store-api';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';

export default function StoreRegisterPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const returnUrl = getPostAuthRedirectUrl(slug, searchParams);
  const { setSession } = useStoreCustomerAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await registerStoreMember(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        website,
      });
      setSession({
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        customer: result.customer,
      });
      if (returnUrl.includes('checkout')) {
        router.push(`/store/${slug}/account/addresses?returnUrl=${encodeURIComponent(returnUrl)}&welcome=1`);
        return;
      }
      router.push(`/store/${slug}/account`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>Daftar untuk Belanja</h1>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
        Buat akun pelanggan untuk checkout online. Kode member otomatis dibuat setelah daftar.
      </p>

      {error ? (
        <div role="alert" style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem' }}>
          {error}
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.75rem' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Nama lengkap *
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          No. HP (WhatsApp) *
          <input required type="tel" inputMode="tel" placeholder="08xxxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Email (opsional)
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Password * (min. 8 karakter)
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Ulangi password *
          <input required type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }} />
        </label>
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} />
        <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
          {loading ? 'Mendaftar…' : 'Daftar'}
        </Button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
        Sudah punya akun?{' '}
        <Link href={`/store/${slug}/login?redirect=${encodeURIComponent(returnUrl)}`} style={{ color: colors.primary[600] }}>
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
