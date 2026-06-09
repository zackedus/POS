'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { confirmMockPayment, fetchOrderStatus } from '@/lib/store/store-api';

export default function OrderPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const orderNo = params.orderId as string;
  const isMock = searchParams.get('mock') === '1';

  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [total, setTotal] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'FULL_ONLINE' | 'COD'>('FULL_ONLINE');
  const [balanceDue, setBalanceDue] = useState<number | null>(null);
  const [midtransMode, setMidtransMode] = useState<'mock' | 'sandbox' | 'live'>('mock');

  useEffect(() => {
    const phone = sessionStorage.getItem(`barokah-order-phone:${slug}:${orderNo}`) ?? '';
    if (!phone) {
      setError('Sesi checkout tidak ditemukan. Gunakan no. HP saat checkout untuk melanjutkan.');
      setLoading(false);
      return;
    }

    void fetchOrderStatus(slug, orderNo, phone)
      .then((data) => {
        if (data.status === 'PAID') {
          router.replace(`/store/${slug}/order/${orderNo}/success`);
          return;
        }
        if (!isMock && data.midtransMode === 'mock') {
          router.replace(`/store/${slug}/order/${orderNo}/pay?mock=1`);
          return;
        }
        if (isMock && data.midtransMode !== 'mock') {
          setError('Mode simulasi tidak tersedia — Midtrans sudah dikonfigurasi.');
          return;
        }
        if (!['NEW', 'PENDING_PAYMENT'].includes(data.status)) {
          setError(`Pesanan tidak dapat dibayar (status: ${data.statusLabel}).`);
          return;
        }
        setChargeAmount(data.chargeAmount);
        setTotal(data.total);
        setPaymentMode(data.paymentMode);
        setBalanceDue(data.balanceDue);
        setMidtransMode(data.midtransMode);
      })
      .catch((err) => {
        setError(mapApiError(err, 'Gagal memuat detail pembayaran.'));
      })
      .finally(() => setLoading(false));
  }, [slug, orderNo, isMock, router]);

  async function handleMockPay() {
    const phone = sessionStorage.getItem(`barokah-order-phone:${slug}:${orderNo}`) ?? '';
    if (!phone) {
      setError('Sesi checkout tidak ditemukan.');
      return;
    }

    setPaying(true);
    setError(null);
    try {
      await confirmMockPayment(slug, orderNo, phone);
      router.push(`/store/${slug}/order/${orderNo}/success`);
    } catch (err) {
      setError(mapApiError(err, 'Gagal mengonfirmasi pembayaran.'));
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>Memuat pembayaran…</div>;
  }

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 480, margin: '0 auto' }}>
      <Link href={`/store/${slug}`} style={{ color: colors.primary[600], textDecoration: 'none', fontSize: '0.875rem' }}>
        ← Kembali ke toko
      </Link>

      <div>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem' }}>Pembayaran pesanan</h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary, fontFamily: 'ui-monospace, monospace' }}>
          {orderNo}
        </p>
      </div>

      {isMock ? (
        <AlertBanner variant="warning">
          Mode simulasi dev — Midtrans belum dikonfigurasi. Klik tombol di bawah untuk mensimulasikan pembayaran.
        </AlertBanner>
      ) : midtransMode === 'sandbox' ? (
        <AlertBanner variant="info">
          Midtrans Sandbox — gunakan kartu/QRIS uji dari dashboard Midtrans. Setelah bayar, status pesanan diperbarui via webhook.
        </AlertBanner>
      ) : null}

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {!error && chargeAmount > 0 ? (
        <section
          style={{
            padding: '1.25rem',
            borderRadius: 12,
            border: `1px solid ${colors.light.border.default}`,
            background: colors.light.bg.muted,
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
            {paymentMode === 'COD' ? 'Uang muka (20%)' : 'Total pembayaran'}
          </p>
          <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: colors.primary[700] }}>
            {formatCurrency(chargeAmount)}
          </p>
          {paymentMode === 'COD' && balanceDue != null ? (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
              Sisa {formatCurrency(balanceDue)} dibayar saat barang diterima · Total pesanan {formatCurrency(total)}
            </p>
          ) : null}
        </section>
      ) : null}

      {isMock && !error && chargeAmount > 0 ? (
        <Button fullWidth disabled={paying} onClick={() => void handleMockPay()}>
          {paying ? 'Memproses…' : paymentMode === 'COD' ? 'Simulasi bayar uang muka' : 'Simulasi bayar online'}
        </Button>
      ) : null}

      {!isMock && !error ? (
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>
          Anda akan dialihkan ke halaman Midtrans. Jika tidak otomatis, gunakan tombol coba lagi dari halaman status pesanan.
        </p>
      ) : null}
    </div>
  );
}
