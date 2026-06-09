'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import { fetchOrderStatus } from '@/lib/store/store-api';

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

  useEffect(() => {
    if (legacyMockPaid) {
      router.replace(`/store/${slug}/order/${orderNo}/pay?mock=1`);
      return;
    }

    const phone = sessionStorage.getItem(`barokah-order-phone:${slug}:${orderNo}`) ?? '';
    if (!phone) {
      setStatusLabel('Menunggu pembayaran');
      return;
    }

    void fetchOrderStatus(slug, orderNo, phone)
      .then((data) => {
        setOrderStatus(data.status);
        setStatusLabel(data.statusLabel);
        setOutletName(data.outletName);
        setFulfillmentType(data.fulfillmentType);
        if (['NEW', 'PENDING_PAYMENT'].includes(data.status) && data.midtransMode === 'mock') {
          router.replace(`/store/${slug}/order/${orderNo}/pay?mock=1`);
        }
      })
      .catch(() => {
        setStatusLabel('Menunggu pembayaran');
      });
  }, [slug, orderNo, legacyMockPaid, router]);

  const isPaid = orderStatus === 'PAID';

  return (
    <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem', color: isPaid ? colors.semantic.success : colors.semantic.info }}>
        {isPaid ? '✓' : '⏳'}
      </div>
      <h1 style={{ margin: 0, fontSize: '1.375rem', color: isPaid ? colors.semantic.success : colors.light.text.primary }}>
        {isPaid ? 'Pembayaran berhasil!' : 'Pesanan dibuat — menunggu pembayaran'}
      </h1>

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

      {!isPaid ? (
        <Link href={`/store/${slug}/order/${orderNo}/pay?mock=1`} style={{ fontSize: '0.875rem', color: colors.primary[600] }}>
          Lanjut ke pembayaran →
        </Link>
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
