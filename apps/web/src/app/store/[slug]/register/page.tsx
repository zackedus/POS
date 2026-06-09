'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import { registerStoreMember } from '@/lib/store/store-api';

export default function StoreRegisterPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ points: number; message: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await registerStoreMember(slug, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        website,
      });
      setSuccess({
        points: result.customer.points,
        message: result.message,
      });
      setName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.25rem' }}>Daftar Member</h1>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
        Dapatkan poin loyalty saat belanja di toko atau checkout online. Bukan untuk akun staff kasir.
      </p>

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

      {success ? (
        <div
          role="status"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            borderRadius: 8,
            background: '#f0fdf4',
            color: '#166534',
            fontSize: '0.875rem',
          }}
        >
          <strong>Berhasil!</strong> {success.message}
          <div style={{ marginTop: '0.35rem' }}>Saldo poin: {success.points.toLocaleString('id-ID')}</div>
        </div>
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.75rem' }}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Nama lengkap *
          <input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          No. HP (WhatsApp) *
          <input
            required
            type="tel"
            inputMode="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}
          />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
          Email (opsional)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '0.65rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}` }}
          />
        </label>
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
        />
        <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: '0.25rem' }}>
          {loading ? 'Mendaftar…' : 'Daftar Member'}
        </Button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
        Sudah punya nomor terdaftar? Langsung checkout — poin otomatis terkumpul.{' '}
        <Link href={`/store/${slug}/products`} style={{ color: colors.primary[600] }}>
          Kembali ke katalog
        </Link>
      </p>
    </div>
  );
}
