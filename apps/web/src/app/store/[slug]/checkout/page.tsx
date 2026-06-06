'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@barokah/shared';
import { Button, Input, colors } from '@barokah/ui';
import { OrderSummary } from '@/components/store/OrderSummary';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { createOrder, type StoreFulfillmentType } from '@/lib/store/store-api';
import { calculateOrderTotals, calculateSubtotal, DELIVERY_FLAT_FEE } from '@/lib/store/pricing';
import { useStoreCart } from '@/lib/store/cart-context';
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
  const { outlets, outletId, setOutletId } = useStoreOutlet(slug);

  const [fulfillmentType, setFulfillmentType] = useState<StoreFulfillmentType>('PICKUP');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [street, setStreet] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const subtotal = calculateSubtotal(lines);
  const shippingFee = fulfillmentType === 'DELIVERY' ? DELIVERY_FLAT_FEE : 0;
  const { tax, total } = calculateOrderTotals(subtotal, shippingFee);
  const selectedOutlet = outlets.find((o) => o.id === outletId);

  if (lines.length === 0) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p>Keranjang kosong.</p>
        <Link href={`/store/${slug}/cart`}>Kembali ke keranjang</Link>
      </div>
    );
  }

  async function handleSubmit() {
    setFormError(null);
    if (!name.trim() || name.trim().length < 2) {
      setFormError('Nama lengkap wajib diisi (min. 2 karakter).');
      return;
    }
    if (!/^08\d{8,11}$/.test(phone.trim())) {
      setFormError('No. HP tidak valid. Gunakan format Indonesia (08…).');
      return;
    }
    if (!outletId) {
      setFormError('Pilih cabang toko.');
      return;
    }
    if (fulfillmentType === 'DELIVERY') {
      if (!street.trim() || street.trim().length < 5) {
        setFormError('Alamat jalan wajib diisi (min. 5 karakter).');
        return;
      }
      if (!district.trim()) {
        setFormError('Kecamatan wajib diisi.');
        return;
      }
      if (!city.trim()) {
        setFormError('Kota/kabupaten wajib diisi.');
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
        deliveryAddress:
          fulfillmentType === 'DELIVERY'
            ? {
                street: street.trim(),
                district: district.trim(),
                city: city.trim(),
                postalCode: postalCode.trim() || undefined,
              }
            : undefined,
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

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Metode pengambilan</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            style={tabStyle(fulfillmentType === 'PICKUP')}
            onClick={() => setFulfillmentType('PICKUP')}
          >
            Pickup di toko
          </button>
          <button
            type="button"
            style={tabStyle(fulfillmentType === 'DELIVERY')}
            onClick={() => setFulfillmentType('DELIVERY')}
          >
            Antar ke alamat
          </button>
        </div>
        {fulfillmentType === 'DELIVERY' ? (
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
            Ongkir flat {formatCurrency(DELIVERY_FLAT_FEE)} (estimasi). Biaya final mengikuti kebijakan toko.
          </p>
        ) : null}
      </section>

      <section>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600, fontSize: '0.9375rem' }}>
          {fulfillmentType === 'PICKUP' ? 'Pilih cabang pickup *' : 'Cabang pengiriman *'}
        </p>
        {outlets.map((outlet) => (
          <label
            key={outlet.id}
            style={{
              display: 'block',
              padding: '0.75rem',
              marginBottom: '0.5rem',
              borderRadius: 8,
              border: `2px solid ${outletId === outlet.id ? colors.primary[600] : colors.light.border.default}`,
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="outlet"
              value={outlet.id}
              checked={outletId === outlet.id}
              onChange={() => {
                setOutletId(outlet.id);
                setStockError(null);
              }}
              style={{ marginRight: '0.5rem' }}
            />
            {outlet.name} — {outlet.address}
          </label>
        ))}
      </section>

      {fulfillmentType === 'DELIVERY' ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Alamat pengiriman</h2>
          <Input
            label="Alamat jalan *"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="Jl. … No. …"
            fullWidth
          />
          <Input label="Kecamatan *" value={district} onChange={(e) => setDistrict(e.target.value)} fullWidth />
          <Input label="Kota/Kabupaten *" value={city} onChange={(e) => setCity(e.target.value)} fullWidth />
          <Input
            label="Kode pos (opsional)"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="40123"
            fullWidth
          />
        </section>
      ) : null}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Data kontak</h2>
        <Input label="Nama lengkap *" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <Input
          label="No. HP (WhatsApp) *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0812xxxxxxxx"
          fullWidth
        />
        <Input
          label="Catatan order (opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
        />
      </section>

      {formError ? <AlertBanner variant="error">{formError}</AlertBanner> : null}

      {stockError ? <AlertBanner variant="warning">⚠ {stockError}</AlertBanner> : null}

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Ringkasan pesanan</h2>
        {lines.map((line) => (
          <div key={line.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.375rem' }}>
            <span>
              {line.quantity}× {line.name}
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(line.price * line.quantity)}</span>
          </div>
        ))}
        <div style={{ marginTop: '0.75rem' }}>
          <OrderSummary subtotal={subtotal} tax={tax} total={total} shippingFee={shippingFee} />
        </div>
        {fulfillmentType === 'PICKUP' && selectedOutlet ? (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
            📍 Ambil di: {selectedOutlet.name}
            <br />
            {selectedOutlet.address}
            <br />
            ⏱ Estimasi siap: 2–4 jam kerja
          </p>
        ) : null}
        {fulfillmentType === 'DELIVERY' ? (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
            🚚 Estimasi pengiriman: 1–2 hari kerja setelah order siap
          </p>
        ) : null}
      </section>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          padding: '1rem',
          background: colors.light.bg.base,
          borderTop: `1px solid ${colors.light.border.default}`,
        }}
      >
        <Button fullWidth disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? 'Mengalihkan ke pembayaran…' : 'Lanjut pembayaran'}
        </Button>
      </div>
    </div>
  );
}
