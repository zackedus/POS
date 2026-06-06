'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { QtyStepper } from '@/components/store/QtyStepper';
import { OrderSummary } from '@/components/store/OrderSummary';
import { mapApiError } from '@/lib/api-client';
import { fetchProduct } from '@/lib/store/store-api';
import { calculateOrderTotals, calculateSubtotal } from '@/lib/store/pricing';
import { useStoreCart } from '@/lib/store/cart-context';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

export default function StoreCartPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { outletId } = useStoreOutlet(slug);
  const { lines, updateQuantity, removeItem } = useStoreCart();
  const [lineError, setLineError] = useState<string | null>(null);

  const subtotal = calculateSubtotal(lines);
  const { tax, total } = calculateOrderTotals(subtotal);

  if (lines.length === 0) {
    return (
      <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.125rem' }}>🛒 Keranjang masih kosong</p>
        <p style={{ color: colors.light.text.secondary }}>Yuk, pilih material untuk proyekmu</p>
        <div style={{ marginTop: '1.5rem' }}>
          <Link href={`/store/${slug}`}>
            <Button>Lihat katalog</Button>
          </Link>
        </div>
      </div>
    );
  }

  async function handleQtyChange(productId: string, qty: number) {
    if (!outletId) return;
    setLineError(null);
    try {
      const product = await fetchProduct(slug, productId, outletId);
      if (product.stockStatus === 'OUT_OF_STOCK') {
        setLineError('Stok habis di cabang ini.');
        return;
      }
      if (qty > 0 && qty < product.moq) {
        setLineError(`Min. order ${product.moq} ${product.unitSymbol}.`);
        return;
      }
      if (qty > 0 && qty % product.orderStep !== 0) {
        setLineError(`Kelipatan order: ${product.orderStep} ${product.unitSymbol}.`);
        return;
      }
      updateQuantity(productId, qty);
    } catch (err) {
      setLineError(mapApiError(err, 'Gagal memvalidasi stok.'));
    }
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: 120 }}>
      <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Keranjang ({lines.length} item)</h1>

      {lineError ? <AlertBanner variant="warning">{lineError}</AlertBanner> : null}

      {lines.map((line) => (
        <div
          key={line.productId}
          style={{
            paddingBottom: '1rem',
            borderBottom: `1px solid ${colors.light.border.default}`,
          }}
        >
          <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{line.name}</p>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: colors.light.text.secondary }}>
            {line.quantity} {line.unitSymbol} × {formatCurrency(line.price)}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <QtyStepper
              value={line.quantity}
              min={1}
              onChange={(q) => void handleQtyChange(line.productId, q)}
            />
            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(line.price * line.quantity)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => removeItem(line.productId)}
            style={{
              marginTop: '0.5rem',
              background: 'none',
              border: 'none',
              color: colors.semantic.error,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Hapus
          </button>
        </div>
      ))}

      <div>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Ringkasan</h2>
        <OrderSummary subtotal={subtotal} tax={tax} total={total} />
      </div>

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
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <Button fullWidth onClick={() => router.push(`/store/${slug}/checkout`)}>
          Lanjut checkout
        </Button>
        <Link
          href={`/store/${slug}`}
          style={{
            textAlign: 'center',
            color: colors.primary[600],
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Lanjutkan belanja
        </Link>
      </div>
    </div>
  );
}
