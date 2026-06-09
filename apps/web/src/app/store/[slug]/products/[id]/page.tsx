'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@barokah/shared';
import { Button, colors } from '@barokah/ui';
import { AlertBanner } from '@/components/dashboard/dashboard-ui';
import { ProductCard } from '@/components/store/ProductCard';
import { QtyStepper } from '@/components/store/QtyStepper';
import { mapApiError } from '@/lib/api-client';
import { fetchProduct, type CatalogProductItem, type StoreProductVariant } from '@/lib/store/store-api';
import { useStoreCart } from '@/lib/store/cart-context';
import { useStoreConfig } from '@/lib/store/store-config-context';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

export default function StoreProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const productId = params.id as string;
  const { accentColor } = useStoreConfig();
  const { outlets, outletId } = useStoreOutlet(slug);
  const [quantity, setQuantity] = useState(1);
  const [toast, setToast] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [product, setProduct] = useState<(CatalogProductItem & { relatedProducts?: Array<{ id: string; name: string; price: number; unitSymbol: string; stockStatus?: 'AVAILABLE' | 'OUT_OF_STOCK' }> }) | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useStoreCart();

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void fetchProduct(slug, productId, outletId)
      .then((item) => {
        if (!cancelled) {
          setProduct(item);
          const defaultVariant = item.variants?.find((v) => v.stockStatus !== 'OUT_OF_STOCK') ?? item.variants?.[0];
          setSelectedVariantId(defaultVariant?.id ?? null);
          const moq = defaultVariant?.moq ?? item.moq;
          setQuantity(Math.max(moq, 1));
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProduct(null);
          setLoadError(mapApiError(err, 'Gagal memuat detail produk.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, productId, outletId]);

  const selectedVariant: StoreProductVariant | null = useMemo(() => {
    if (!product?.variants?.length || !selectedVariantId) return null;
    return product.variants.find((v) => v.id === selectedVariantId) ?? null;
  }, [product, selectedVariantId]);

  const sellSku = selectedVariant ?? product;
  const moq = sellSku?.moq ?? 1;
  const orderStep = sellSku?.orderStep ?? 1;
  const unitPrice = sellSku?.price ?? product?.price ?? 0;
  const unitSymbol = product?.unitSymbol ?? 'pcs';
  const outOfStock = selectedVariant
    ? selectedVariant.stockStatus === 'OUT_OF_STOCK'
    : product?.stockStatus === 'OUT_OF_STOCK';

  if (loading) {
    return <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>Memuat produk…</div>;
  }

  if (!product) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p>{loadError ?? 'Produk tidak ditemukan.'}</p>
        <Link href={`/store/${slug}/products`}>Kembali ke katalog</Link>
      </div>
    );
  }

  const selectedOutlet = outlets.find((o) => o.id === outletId);
  const hasVariants = Boolean(product.hasVariants && product.variants && product.variants.length > 0);

  function validateQty(qty: number): string | null {
    if (hasVariants && !selectedVariant) return 'Pilih varian produk terlebih dahulu.';
    if (qty < moq) return `Min. order ${moq} ${unitSymbol}.`;
    if (qty % orderStep !== 0) return `Kelipatan order: ${orderStep} ${unitSymbol}.`;
    return null;
  }

  function handleAddToCart() {
    if (!product || !sellSku) return;
    const error = validateQty(quantity);
    if (error) {
      setValidationError(error);
      return;
    }
    const cartProductId = selectedVariant?.id ?? product.id;
    addItem({
      productId: cartProductId,
      name: selectedVariant ? `${product.name} — ${selectedVariant.variantLabel ?? selectedVariant.name}` : product.name,
      sku: selectedVariant?.sku ?? product.sku,
      unitSymbol,
      price: unitPrice,
      quantity,
    });
    setValidationError(null);
    setToast('Ditambahkan ke keranjang');
    setTimeout(() => setToast(null), 2000);
  }

  function handleVariantChange(variantId: string) {
    setSelectedVariantId(variantId);
    setValidationError(null);
    const variant = product?.variants?.find((v) => v.id === variantId);
    if (variant) setQuantity(Math.max(variant.moq, 1));
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '0.75rem 1rem' }}>
        <Link href={`/store/${slug}/products`} style={{ color: accentColor, textDecoration: 'none' }}>
          ← Kembali
        </Link>
      </div>

      <div style={{ margin: '0 1rem', aspectRatio: '4/3', borderRadius: 8, background: colors.light.bg.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {!product.imageUrl ? '🏗️' : null}
      </div>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{product.name}</h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>
          SKU: {selectedVariant?.sku ?? product.sku} · {unitSymbol}
        </p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: outOfStock ? colors.light.text.secondary : colors.semantic.success }}>
          {outOfStock ? '○ Habis' : `● Tersedia di ${selectedOutlet?.name ?? 'cabang'}`}
        </p>
        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {hasVariants && !selectedVariant ? 'Pilih varian' : formatCurrency(unitPrice)} / {unitSymbol}
        </p>

        {hasVariants ? (
          <div>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Pilih varian *</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {product.variants!.map((variant) => {
                const active = variant.id === selectedVariantId;
                const disabled = variant.stockStatus === 'OUT_OF_STOCK';
                return (
                  <button key={variant.id} type="button" disabled={disabled} onClick={() => handleVariantChange(variant.id)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: `2px solid ${active ? accentColor : colors.light.border.default}`, background: active ? `${accentColor}14` : colors.light.bg.base, color: disabled ? colors.light.text.secondary : colors.light.text.primary, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.8125rem', fontWeight: active ? 700 : 500 }}>
                    {variant.variantLabel ?? variant.name}
                    <br />
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(variant.price)}</span>
                    {disabled ? ' · Habis' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {moq > 1 || orderStep > 1 ? (
          <div style={{ padding: '0.75rem', borderRadius: 8, background: colors.light.bg.muted, fontSize: '0.875rem' }}>
            ℹ Min. order {moq} {unitSymbol} · kelipatan {orderStep}
          </div>
        ) : null}

        {validationError ? <AlertBanner variant="warning">{validationError}</AlertBanner> : null}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem' }}>Jumlah:</span>
          <QtyStepper value={quantity} min={moq} disabled={outOfStock || (hasVariants && !selectedVariant)} onChange={(q) => { setQuantity(q); setValidationError(null); }} />
        </div>
      </div>

      {product.relatedProducts && product.relatedProducts.length > 0 ? (
        <section style={{ padding: '0 1rem 1rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Produk Terkait</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
            {product.relatedProducts.map((related) => (
              <ProductCard key={related.id} slug={slug} productId={related.id} name={related.name} price={related.price} unitSymbol={related.unitSymbol} stockStatus="AVAILABLE" accentColor={accentColor} />
            ))}
          </div>
        </section>
      ) : null}

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '1rem', background: colors.light.bg.base, borderTop: `1px solid ${colors.light.border.default}` }}>
        <Button fullWidth disabled={outOfStock || (hasVariants && !selectedVariant)} onClick={handleAddToCart}>
          {outOfStock ? 'Stok habis di cabang ini' : 'Tambah ke keranjang'}
        </Button>
      </div>

      {toast ? (
        <div style={{ position: 'fixed', bottom: 88, left: '50%', transform: 'translateX(-50%)', background: colors.light.text.primary, color: colors.light.text.inverse, padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', maxWidth: '90%', textAlign: 'center' }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
