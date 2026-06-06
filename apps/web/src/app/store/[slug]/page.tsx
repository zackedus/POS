'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@barokah/ui';
import { colors } from '@barokah/ui';
import { LoadingSkeleton } from '@/components/dashboard/dashboard-ui';
import { ProductCard } from '@/components/store/ProductCard';
import { fetchCategories, fetchProducts, type CatalogProductItem } from '@/lib/store/store-api';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

export default function StoreCatalogPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { outlets, outletId, setOutletId, loading: outletLoading, error: outletError } = useStoreOutlet(slug);
  const [categoryId, setCategoryId] = useState('all');
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cacheHint, setCacheHint] = useState<string | null>(null);

  useEffect(() => {
    setCacheHint(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, []);

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      fetchCategories(slug, outletId),
      fetchProducts(slug, { outletId, categoryId, q: query }),
    ])
      .then(([cats, items]) => {
        if (cancelled) return;
        setCategories(cats);
        setProducts(items);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setProducts([]);
          setLoadError(err instanceof Error ? err.message : 'Gagal memuat katalog toko.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, outletId, categoryId, query]);

  const visibleCategories = useMemo(() => categories, [categories]);

  if (outletError) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: colors.semantic.error }}>
        {outletError}
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 720, margin: '0 auto' }}>
      <div>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.25rem', color: colors.light.text.primary }}>Katalog Produk</h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: colors.light.text.secondary }}>
          Pilih cabang untuk melihat stok tersedia, lalu tambahkan ke keranjang.
        </p>
      </div>

      <Input
        label=""
        placeholder="Cari semen, pipa, SKU..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        fullWidth
        aria-label="Cari produk"
      />

      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.25rem',
        }}
        role="tablist"
        aria-label="Filter kategori"
      >
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            style={{
              flexShrink: 0,
              minHeight: 44,
              padding: '0 1rem',
              borderRadius: 20,
              border: `1px solid ${categoryId === cat.id ? colors.primary[600] : colors.light.border.default}`,
              background: categoryId === cat.id ? colors.primary[50] : colors.light.bg.base,
              color: categoryId === cat.id ? colors.primary[700] : colors.light.text.primary,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          padding: '0.75rem',
          borderRadius: 8,
          background: colors.light.bg.muted ?? '#f1f5f9',
        }}
      >
        <label style={{ fontSize: '0.875rem', flex: 1 }}>
          Stok per cabang:{' '}
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            disabled={outletLoading}
            style={{
              marginLeft: '0.25rem',
              padding: '0.375rem 0.5rem',
              borderRadius: 6,
              border: `1px solid ${colors.light.border.default}`,
              minHeight: 36,
            }}
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        {cacheHint ? (
          <span style={{ fontSize: '0.75rem', color: colors.light.text.secondary }} title="Terakhir diperbarui">
            ↻ {cacheHint}
          </span>
        ) : null}
      </div>

      {loadError ? (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: 8,
            background: '#fef2f2',
            color: colors.semantic.error,
            border: `1px solid ${colors.semantic.error}`,
            fontSize: '0.875rem',
          }}
        >
          {loadError}
        </div>
      ) : null}

      {loading || outletLoading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && !outletLoading && products.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            color: colors.light.text.secondary,
            borderRadius: 12,
            border: `1px dashed ${colors.light.border.default}`,
          }}
        >
          <p style={{ margin: 0, fontSize: '1.5rem' }} aria-hidden>
            🔍
          </p>
          <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>Tidak ada produk ditemukan</p>
          <p style={{ fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
            {query ? `Untuk "${query}"` : 'Coba pilih kategori lain'}
          </p>
        </div>
      ) : null}

      {!loading && products.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
          }}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              slug={slug}
              productId={product.id}
              name={product.name}
              price={product.price}
              unitSymbol={product.unitSymbol}
              stockStatus={product.stockStatus}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
