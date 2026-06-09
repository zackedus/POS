'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@barokah/shared';
import { Button, Input } from '@barokah/ui';
import { colors } from '@barokah/ui';
import { fetchOrderStatus } from '@/lib/store/store-api';

export default function StoreOrdersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [orderNo, setOrderNo] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof fetchOrderStatus>> | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const status = await fetchOrderStatus(slug, orderNo.trim(), phone.trim());
      setResult(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pesanan tidak ditemukan.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.35rem' }}>Cek Status Pesanan</h1>
      <p style={{ margin: '0 0 1rem', color: colors.light.text.secondary, fontSize: '0.875rem' }}>
        Masukkan nomor pesanan dan nomor HP yang digunakan saat checkout.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <Input
          label="Nomor pesanan"
          value={orderNo}
          onChange={(event) => setOrderNo(event.target.value)}
          placeholder="WEB-20260606-0001"
          required
          fullWidth
        />
        <Input
          label="Nomor HP"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="08123456789"
          required
          fullWidth
        />
        <Button type="submit" variant="primary" fullWidth disabled={loading || !orderNo.trim() || !phone.trim()}>
          {loading ? 'Mencari…' : 'Cek Status'}
        </Button>
      </form>

      {error ? (
        <p role="alert" style={{ marginTop: '1rem', color: colors.semantic.error, fontSize: '0.875rem' }}>
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 12,
            border: `1px solid ${colors.light.border.default}`,
            background: '#f8fafc',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{result.orderNo}</p>
          <p style={{ margin: '0.35rem 0', fontSize: '0.9375rem' }}>{result.statusLabel}</p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
            {result.outletName} · {result.fulfillmentType === 'PICKUP' ? 'Ambil di toko' : 'Pengiriman'}
          </p>
          <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{formatCurrency(result.total)}</p>
          {result.paidAt ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
              Dibayar: {new Date(result.paidAt).toLocaleString('id-ID')}
            </p>
          ) : null}
        </div>
      ) : null}

      <p style={{ marginTop: '1.25rem', fontSize: '0.875rem' }}>
        <Link href={`/store/${slug}/products`} style={{ color: colors.primary[600], textDecoration: 'none' }}>
          ← Kembali ke katalog
        </Link>
      </p>
    </div>
  );
}
