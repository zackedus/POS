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
    <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.125rem', color: colors.light.text.primary }}>Katalog</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
          Cabang
          <select
            value={outletId}
            onChange={(e) => setOutletId(e.target.value)}
            disabled={outletLoading}
            aria-label="Pilih cabang"
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: 8,
              border: `1px solid ${colors.light.border.default}`,
              minHeight: 44,
              fontSize: '0.8125rem',
              background: colors.light.bg.base,
            }}
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Input
        label=""
        placeholder="Cari produk…"
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
            padding: '2rem 1rem',
            color: colors.light.text.secondary,
            borderRadius: 10,
            border: `1px dashed ${colors.light.border.default}`,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada produk</p>
          {query ? (
            <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Coba kata kunci lain</p>
          ) : null}
        </div>
      ) : null}

      {!loading && products.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: '0.625rem',
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
