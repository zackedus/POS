'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { fetchOrderStatus, retryOrderPayment } from '@/lib/store/store-api';

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const orderNo = params.orderId as string;
  const legacyMockPaid = searchParams.get('mockPaid') === '1';

  const [statusLabel, setStatusLabel] = useState('Memuat…');
  const [orderStatus, setOrderStatus] = useState<string>('PENDING_PAYMENT');
  const [outletName, setOutletName] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [midtransMode, setMidtransMode] = useState<'mock' | 'sandbox' | 'live'>('mock');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const phone = sessionStorage.getItem(`barokah-order-phone:${slug}:${orderNo}`) ?? '';
    if (!phone) {
      setStatusLabel('Menunggu pembayaran');
      return null;
    }

    const data = await fetchOrderStatus(slug, orderNo, phone);
    setOrderStatus(data.status);
    setStatusLabel(data.statusLabel);
    setOutletName(data.outletName);
    setFulfillmentType(data.fulfillmentType);
    setMidtransMode(data.midtransMode);

    if (['NEW', 'PENDING_PAYMENT'].includes(data.status) && data.midtransMode === 'mock') {
      router.replace(`/store/${slug}/order/${orderNo}/pay?mock=1`);
      return data;
    }

    return data;
  }, [orderNo, router, slug]);

  useEffect(() => {
    if (legacyMockPaid) {
      router.replace(`/store/${slug}/order/${orderNo}/pay?mock=1`);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    void loadStatus()
      .then((data) => {
        if (cancelled || !data) return;
        if (data.status === 'PAID') return;
        if (data.midtransMode === 'sandbox' || data.midtransMode === 'live') {
          pollTimer = setInterval(() => {
            void loadStatus().catch(() => undefined);
          }, 3000);
        }
      })
      .catch(() => {
        if (!cancelled) setStatusLabel('Menunggu pembayaran');
      });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [legacyMockPaid, loadStatus, orderNo, router, slug]);

  async function handleRetryPayment() {
    const phone = sessionStorage.getItem(`barokah-order-phone:${slug}:${orderNo}`) ?? '';
    if (!phone) {
      setError('Sesi checkout tidak ditemukan.');
      return;
    }

    setRetrying(true);
    setError(null);
    try {
      const result = await retryOrderPayment(slug, orderNo, phone);
      if (result.payment.redirectUrl.startsWith('http')) {
        window.location.href = result.payment.redirectUrl;
      } else {
        router.push(result.payment.redirectUrl);
      }
    } catch (err) {
      setError(mapApiError(err, 'Gagal membuka halaman pembayaran.'));
    } finally {
      setRetrying(false);
    }
  }

  const isPaid = orderStatus === 'PAID';
  const payHref =
    midtransMode === 'mock'
      ? `/store/${slug}/order/${orderNo}/pay?mock=1`
      : undefined;

  return (
    <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem', color: isPaid ? colors.semantic.success : colors.semantic.info }}>
        {isPaid ? '✓' : '⏳'}
      </div>
      <h1 style={{ margin: 0, fontSize: '1.375rem', color: isPaid ? colors.semantic.success : colors.light.text.primary }}>
        {isPaid ? 'Pembayaran berhasil!' : 'Pesanan dibuat — menunggu pembayaran'}
      </h1>

      {!isPaid && midtransMode === 'sandbox' ? (
        <AlertBanner variant="info">
          Midtrans Sandbox — menunggu konfirmasi pembayaran. Halaman ini memperbarui status otomatis.
        </AlertBanner>
      ) : null}

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      <div>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
          No. pesanan
        </p>
        <p
          style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: 700,
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {orderNo}
        </p>
      </div>

      <p style={{ margin: 0, fontSize: '0.9375rem', color: colors.semantic.info }}>
        Status: {statusLabel}
      </p>

      {!isPaid && payHref ? (
        <Link href={payHref} style={{ fontSize: '0.875rem', color: colors.primary[600] }}>
          Lanjut ke pembayaran →
        </Link>
      ) : null}

      {!isPaid && midtransMode !== 'mock' ? (
        <Button fullWidth disabled={retrying} onClick={() => void handleRetryPayment()}>
          {retrying ? 'Membuka Midtrans…' : 'Bayar / coba lagi via Midtrans'}
        </Button>
      ) : null}

      <div
        style={{
          textAlign: 'left',
          padding: '1rem',
          borderRadius: 8,
          background: colors.light.bg.muted,
          fontSize: '0.875rem',
        }}
      >
        {fulfillmentType === 'DELIVERY' ? (
          <>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Pengiriman ke alamat Anda</p>
            <p style={{ margin: 0 }}>🚚 Dikirim dari: {outletName || 'Cabang toko'}</p>
            <p style={{ margin: '1rem 0 0' }}>Tim toko akan menghubungi Anda via WhatsApp untuk konfirmasi alamat.</p>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Ambil di:</p>
            <p style={{ margin: 0 }}>📍 {outletName || 'Cabang pickup'}</p>
            <p style={{ margin: '1rem 0 0' }}>Bawa saat pickup:</p>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem' }}>
              <li>No. pesanan / screenshot ini</li>
              <li>HP terdaftar saat checkout</li>
            </ul>
          </>
        )}
      </div>

      <Link href={`/store/${slug}`}>
        <Button variant="secondary" fullWidth>
          Kembali ke katalog
        </Button>
      </Link>
    </div>
  );
}
