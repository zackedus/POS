'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input, colors } from '@barokah/ui';
import type { StorefrontSortOption } from '@barokah/shared';
import { LoadingSkeleton } from '@/components/dashboard/dashboard-ui';
import { ProductCard } from '@/components/store/ProductCard';
import { fetchCategories, fetchProducts, type CatalogProductItem } from '@/lib/store/store-api';
import { useStoreConfig } from '@/lib/store/store-config-context';
import { useStoreOutlet } from '@/lib/store/use-store-outlet';

interface StoreCatalogGridProps {
  slug: string;
  title?: string;
  compact?: boolean;
  limit?: number;
}

export function StoreCatalogGrid({ slug, title = 'Katalog Produk', compact = false, limit }: StoreCatalogGridProps) {
  const { config, accentColor } = useStoreConfig();
  const { outlets, outletId, setOutletId, loading: outletLoading, error: outletError } = useStoreOutlet(slug);
  const [categoryId, setCategoryId] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<StorefrontSortOption>('name_asc');
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (config?.settings.catalog.defaultSort) {
      setSort(config.settings.catalog.defaultSort);
    }
  }, [config?.settings.catalog.defaultSort]);

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    void Promise.all([
      fetchCategories(slug, outletId),
      fetchProducts(slug, {
        outletId,
        categoryId,
        q: query,
        page,
        limit: limit ?? 20,
        sort,
      }),
    ])
      .then(([cats, result]) => {
        if (cancelled) return;
        setCategories(cats);
        setProducts(result.items);
        setTotalPages(result.meta.totalPages);
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
  }, [slug, outletId, categoryId, query, page, sort, limit]);

  const visibleCategories = useMemo(() => categories, [categories]);

  if (outletError) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: colors.semantic.error }}>
        {outletError}
      </div>
    );
  }

  return (
    <div style={{ padding: compact ? '0.5rem 0.875rem 0.875rem' : '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: compact ? '1rem' : '1.125rem', color: colors.light.text.primary }}>{title}</h1>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
          Cabang
          <select
            value={outletId}
            onChange={(e) => {
              setOutletId(e.target.value);
              setPage(1);
            }}
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
        placeholder="Cari semen, pipa, SKU..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        fullWidth
        aria-label="Cari produk"
      />

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <label style={{ fontSize: '0.8125rem', color: colors.light.text.secondary }}>
          Urutkan
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as StorefrontSortOption);
              setPage(1);
            }}
            style={{ marginLeft: 6, padding: '0.35rem 0.5rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}`, minHeight: 40 }}
          >
            <option value="name_asc">Nama A→Z</option>
            <option value="name_desc">Nama Z→A</option>
            <option value="price_asc">Harga terendah</option>
            <option value="price_desc">Harga tertinggi</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }} role="tablist" aria-label="Filter kategori">
        {visibleCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => {
              setCategoryId(cat.id);
              setPage(1);
            }}
            style={{
              flexShrink: 0,
              minHeight: 44,
              padding: '0 1rem',
              borderRadius: 20,
              border: `1px solid ${categoryId === cat.id ? accentColor : colors.light.border.default}`,
              background: categoryId === cat.id ? `${accentColor}14` : colors.light.bg.base,
              color: categoryId === cat.id ? accentColor : colors.light.text.primary,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {loadError ? (
        <div role="alert" style={{ padding: '1rem', borderRadius: 8, background: '#fef2f2', color: colors.semantic.error, border: `1px solid ${colors.semantic.error}`, fontSize: '0.875rem' }}>
          {loadError}
        </div>
      ) : null}

      {loading || outletLoading ? <LoadingSkeleton rows={4} /> : null}

      {!loading && !outletLoading && products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: colors.light.text.secondary, borderRadius: 10, border: `1px dashed ${colors.light.border.default}` }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada produk</p>
          {query ? <p style={{ fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>Coba kata kunci lain</p> : null}
        </div>
      ) : null}

      {!loading && products.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
          {products.map((product) => (
            <ProductCard key={product.id} slug={slug} productId={product.id} name={product.name} price={product.price} unitSymbol={product.unitSymbol} stockStatus={product.stockStatus} accentColor={accentColor} />
          ))}
        </div>
      ) : null}

      {!compact && totalPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ minHeight: 44, padding: '0 1rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}`, background: colors.light.bg.base }}>
            Sebelumnya
          </button>
          <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: colors.light.text.secondary }}>
            Halaman {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ minHeight: 44, padding: '0 1rem', borderRadius: 8, border: `1px solid ${colors.light.border.default}`, background: colors.light.bg.base }}>
            Berikutnya
          </button>
        </div>
      ) : null}

      {compact ? (
        <Link href={`/store/${slug}/products`} style={{ textAlign: 'center', color: accentColor, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
          Lihat semua produk →
        </Link>
      ) : null}
    </div>
  );
}
