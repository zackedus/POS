'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button, Input, colors } from '@barokah/ui';
import { OrderSummary } from '@/components/store/OrderSummary';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import {
  createOrder,
  fetchStoreCustomerAddresses,
  type StoreFulfillmentType,
} from '@/lib/store/store-api';
import type { StoreCustomerAddress } from '@/lib/store/store-customer-auth-context';
import { useStoreCustomerAuth } from '@/lib/store/store-customer-auth-context';
import { calculateOrderTotals, calculateSubtotal, DELIVERY_FLAT_FEE } from '@/lib/store/pricing';
import { useStoreCart } from '@/lib/store/cart-context';
import { useStoreConfig } from '@/lib/store/store-config-context';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

const tabStyle = (active: boolean) => ({
  flex: 1,
  minHeight: 44,
  borderRadius: 8,
  border: `2px solid ${active ? colors.primary[600] : colors.light.border.default}`,
  background: active ? colors.primary[50] : colors.light.bg.base,
  color: active ? colors.primary[700] : colors.light.text.primary,
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer' as const,
});

export default function StoreCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { lines, clearCart } = useStoreCart();
  const { config } = useStoreConfig();
  const { outlets, outletId, setOutletId } = useStoreOutlet(slug);
  const { customer, accessToken, isLoggedIn, loading: authLoading } = useStoreCustomerAuth();
  const settings = config?.settings;
  const requireLogin = settings?.checkout.requireCustomerLogin !== false;

  const [fulfillmentType, setFulfillmentType] = useState<StoreFulfillmentType>(
    settings?.branches.pickupEnabled === false ? 'DELIVERY' : 'PICKUP',
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState<StoreCustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
    }
  }, [customer]);

  useEffect(() => {
    if (!authLoading && requireLogin && !isLoggedIn) {
      router.replace(`/store/${slug}/login?redirect=${encodeURIComponent(`/store/${slug}/checkout`)}`);
    }
  }, [authLoading, requireLogin, isLoggedIn, router, slug]);

  useEffect(() => {
    if (!accessToken || !isLoggedIn) return;
    void fetchStoreCustomerAddresses(slug, accessToken)
      .then((rows) => {
        setAddresses(rows);
        const defaultAddr = rows.find((a) => a.isDefault) ?? rows[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      })
      .catch(() => setAddresses([]));
  }, [accessToken, isLoggedIn, slug]);

  const subtotal = calculateSubtotal(lines);
  const shippingFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FLAT_FEE : 0;
  const { tax, total } = calculateOrderTotals(subtotal, shippingFee);

  if (lines.length === 0) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p>Keranjang kosong.</p>
        <Link href={`/store/${slug}/cart`}>Kembali ke keranjang</Link>
      </div>
    );
  }

  if (authLoading || (requireLogin && !isLoggedIn)) {
    return <div style={{ padding: '1rem' }}>Memuat checkout…</div>;
  }

  async function handleSubmit() {
    setFormError(null);
    if (settings?.checkout.requireName !== false && (!name.trim() || name.trim().length < 2)) {
      setFormError('Nama lengkap wajib diisi (min. 2 karakter).');
      return;
    }
    if (settings?.checkout.requirePhone !== false && !/^08\d{8,11}$/.test(phone.trim())) {
      setFormError('No. HP tidak valid. Gunakan format Indonesia (08…).');
      return;
    }
    if (!outletId) {
      setFormError('Pilih cabang toko.');
      return;
    }
    if (fulfillmentType === 'DELIVERY' && requireLogin) {
      if (addresses.length === 0) {
        setFormError('Tambahkan alamat pengiriman terlebih dahulu.');
        return;
      }
      if (!selectedAddressId) {
        setFormError('Pilih alamat pengiriman.');
        return;
      }
    }

    setStockError(null);
    setSubmitting(true);

    try {
      const clientRequestId = crypto.randomUUID();
      const result = await createOrder({
        slug,
        outletId,
        customer: { name: name.trim(), phone: phone.trim(), notes: notes.trim() || undefined },
        items: lines,
        clientRequestId,
        fulfillmentType,
        customerAddressId: fulfillmentType === 'DELIVERY' && requireLogin ? selectedAddressId ?? undefined : undefined,
        accessToken,
        website: website.trim() || undefined,
      });
      sessionStorage.setItem(`barokah-order-phone:${slug}:${result.order.orderNo}`, phone.trim());
      clearCart();
      if (result.payment.redirectUrl.startsWith('http')) {
        window.location.href = result.payment.redirectUrl;
      } else {
        router.push(result.payment.redirectUrl);
      }
    } catch (error) {
      const code = (error as Error & { code?: string }).code;
      const message = mapApiError(error, 'Gagal membuat pesanan.');
      if (code === 'INSUFFICIENT_STOCK') {
        setStockError(message);
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: 100 }}>
      <Link href={`/store/${slug}/cart`} style={{ color: colors.primary[600], textDecoration: 'none' }}>
        ← Checkout
      </Link>

      {requireLogin && customer ? (
        <p style={{ margin: 0, fontSize: '0.8125rem', color: colors.light.text.secondary }}>
          Checkout sebagai <strong>{customer.name}</strong> · {customer.memberCode}
        </p>
      ) : null}

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Metode pengambilan</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {settings?.branches.pickupEnabled !== false ? (
            <button type="button" style={tabStyle(fulfillmentType === 'PICKUP')} onClick={() => setFulfillmentType('PICKUP')}>
              Pickup di toko
            </button>
          ) : null}
          {settings?.branches.deliveryEnabled !== false ? (
            <button type="button" style={tabStyle(fulfillmentType === 'DELIVERY')} onClick={() => setFulfillmentType('DELIVERY')}>
              Antar ke alamat
            </button>
          ) : null}
        </div>
      </section>

      <section>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9375rem' }}>
          {fulfillmentType === 'PICKUP' ? 'Pilih cabang pickup *' : 'Cabang pengiriman *'}
        </p>
        {outlets.map((outlet) => (
          <label key={outlet.id} style={{ display: 'block', padding: '0.75rem', marginBottom: '0.5rem', borderRadius: 8, border: `2px solid ${outletId === outlet.id ? colors.primary[600] : colors.light.border.default}`, cursor: 'pointer' }}>
            <input type="radio" name="outlet" value={outlet.id} checked={outletId === outlet.id} onChange={() => { setOutletId(outlet.id); setStockError(null); }} style={{ marginRight: '0.5rem' }} />
            {outlet.name} — {outlet.address}
          </label>
        ))}
      </section>

      {fulfillmentType === 'DELIVERY' && requireLogin ? (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Alamat pengiriman</h2>
            <Link href={`/store/${slug}/account/addresses?returnUrl=${encodeURIComponent(`/store/${slug}/checkout`)}`} style={{ fontSize: '0.8125rem', color: colors.primary[600] }}>
              Kelola alamat
            </Link>
          </div>
          {addresses.length === 0 ? (
            <AlertBanner variant="warning">
              Belum ada alamat —{' '}
              <Link href={`/store/${slug}/account/addresses?returnUrl=${encodeURIComponent(`/store/${slug}/checkout`)}`}>tambah alamat pengiriman</Link>
            </AlertBanner>
          ) : (
            addresses.map((addr) => (
              <label key={addr.id} style={{ display: 'block', padding: '0.75rem', marginBottom: '0.5rem', borderRadius: 8, border: `2px solid ${selectedAddressId === addr.id ? colors.primary[600] : colors.light.border.default}`, cursor: 'pointer' }}>
                <input type="radio" name="address" checked={selectedAddressId === addr.id} onChange={() => setSelectedAddressId(addr.id)} style={{ marginRight: '0.5rem' }} />
                <strong>{addr.label}</strong>
                {addr.isDefault ? <span style={{ marginLeft: 6, fontSize: '0.6875rem', color: colors.primary[700] }}>Utama</span> : null}
                <div style={{ fontSize: '0.8125rem', color: colors.light.text.secondary, marginTop: 4 }}>
                  {addr.addressLine1}, Kec. {addr.province ?? '-'}, {addr.city}
                </div>
              </label>
            ))
          )}
        </section>
      ) : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Data kontak</h2>
        <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
        <Input label="Nama lengkap *" value={name} onChange={(e) => setName(e.target.value)} fullWidth readOnly={requireLogin} />
        <Input label="No. HP (WhatsApp) *" value={phone} onChange={(e) => setPhone(e.target.value)} fullWidth readOnly={requireLogin} />
        <Input label="Catatan order (opsional)" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
      </section>

      {formError ? <AlertBanner variant="error">{formError}</AlertBanner> : null}
      {stockError ? <AlertBanner variant="warning">⚠ {stockError}</AlertBanner> : null}

      <section>
        <OrderSummary subtotal={subtotal} tax={tax} total={total} shippingFee={shippingFee} />
      </section>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '1rem', background: colors.light.bg.base, borderTop: `1px solid ${colors.light.border.default}` }}>
        <Button fullWidth disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? 'Mengalihkan ke pembayaran…' : 'Lanjut pembayaran'}
        </Button>
      </div>
    </div>
  );
}
