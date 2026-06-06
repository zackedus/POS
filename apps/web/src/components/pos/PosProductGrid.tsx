'use client';

import { useMemo, type CSSProperties } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import type { ProductGridItem } from './pos-types';
import {
  extractCategoryFilters,
  formatShortSku,
  isBundleProduct,
  resolveDisplaySellUnit,
} from './pos-ui-utils';
import { formatProductStockBadge, isOutOfStock } from '@/lib/pos-stock-display';

export interface PosProductGridProps {
  products: ProductGridItem[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  categories?: Array<{ id: string; name: string }>;
  useServerFilter?: boolean;
  loading: boolean;
  stockAlert: string | null;
  error: string | null;
  errorRetry?: { label: string; onClick: () => void } | null;
  onProductClick: (product: ProductGridItem) => void;
}

const chipBase: CSSProperties = {
  minHeight: 44,
  padding: '0 0.875rem',
  borderRadius: 999,
  fontSize: '0.875rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

export function PosProductGrid({
  products,
  search,
  onSearchChange,
  selectedCategoryId,
  onCategoryChange,
  categories: categoriesProp,
  useServerFilter = false,
  loading,
  stockAlert,
  error,
  errorRetry,
  onProductClick,
}: PosProductGridProps) {
  const categories = categoriesProp ?? extractCategoryFilters(products);

  const filteredProducts = useMemo(() => {
    if (useServerFilter) {
      return products;
    }
    const keyword = search.trim().toLowerCase();
    return products.filter((product) => {
      if (selectedCategoryId && product.category?.id !== selectedCategoryId) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        product.name.toLowerCase().includes(keyword) ||
        product.sku.toLowerCase().includes(keyword) ||
        (product.variantLabel?.toLowerCase().includes(keyword) ?? false)
      );
    });
  }, [products, search, selectedCategoryId, useServerFilter]);

  return (
    <section style={{ padding: '0.75rem 1rem 1rem', background: '#f1f5f9', overflow: 'auto', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <label style={{ display: 'block', position: 'relative' }}>
            <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
              Cari produk
            </span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              type="search"
              autoFocus
              aria-label="Cari produk berdasarkan nama atau SKU"
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '0.625rem 0.875rem',
                minHeight: 44,
                fontSize: '0.9375rem',
                outline: 'none',
                background: '#fff',
              }}
              placeholder="Cari nama / SKU…"
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  onSearchChange('');
                }
              }}
            />
          </label>
        </div>
        <span style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {loading ? 'Memuat…' : `${filteredProducts.length} produk`}
        </span>
      </div>

      {categories.length > 0 ? (
        <div
          role="group"
          aria-label="Filter kategori"
          style={{
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '0.5rem',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            aria-pressed={selectedCategoryId === null}
            onClick={() => onCategoryChange(null)}
            style={{
              ...chipBase,
              border: `1px solid ${selectedCategoryId === null ? '#16a34a' : '#e2e8f0'}`,
              background: selectedCategoryId === null ? '#f0fdf4' : '#fff',
              color: selectedCategoryId === null ? '#15803d' : '#475569',
            }}
          >
            Semua
          </button>
          {categories.map((category) => {
            const active = selectedCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(active ? null : category.id)}
                style={{
                  ...chipBase,
                  border: `1px solid ${active ? '#16a34a' : '#e2e8f0'}`,
                  background: active ? '#f0fdf4' : '#fff',
                  color: active ? '#15803d' : '#475569',
                }}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {stockAlert ? (
        <div
          role="alert"
          style={{
            marginBottom: '0.75rem',
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '0.625rem 0.75rem',
            fontSize: '0.875rem',
          }}
        >
          {stockAlert}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: '0.75rem',
            color: '#b91c1c',
            background: '#fee2e2',
            borderRadius: 8,
            padding: '0.625rem 0.75rem',
            fontSize: '0.875rem',
          }}
        >
          {error}
          {errorRetry ? (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={errorRetry.onClick}
                style={{
                  minHeight: 44,
                  padding: '0 0.75rem',
                  borderRadius: 8,
                  border: '1px solid #fca5a5',
                  background: '#fff',
                  color: '#b91c1c',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {errorRetry.label}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Memuat produk…</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '0.625rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
          }}
        >
          {filteredProducts.map((product) => {
            const stockBadge = formatProductStockBadge({
              stockQty: product.stockQty,
              baseUnitSymbol: product.unit?.symbol,
              sellUnits: product.sellUnits,
            });
            const productOutOfStock = isOutOfStock(product.stockQty);
            const displayUnit = resolveDisplaySellUnit(product);
            const isBundle = isBundleProduct(product);
            const multiUnit = Boolean(product.sellUnits && product.sellUnits.length > 1);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onProductClick(product)}
                aria-disabled={productOutOfStock}
                aria-label={`${product.name}${product.variantLabel ? ` ${product.variantLabel}` : ''}, ${formatCurrencyIDR(displayUnit.price)}${displayUnit.unitSymbol ? ` per ${displayUnit.unitSymbol}` : ''}`}
                style={{
                  border: `1px solid ${productOutOfStock ? '#e2e8f0' : '#e2e8f0'}`,
                  borderRadius: 12,
                  padding: '0.75rem',
                  background: productOutOfStock ? '#f8fafc' : '#fff',
                  textAlign: 'left',
                  cursor: productOutOfStock ? 'not-allowed' : 'pointer',
                  minHeight: 108,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  opacity: productOutOfStock ? 0.65 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.35rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: productOutOfStock ? '#64748b' : '#0f172a',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {product.name}
                    </div>
                    {product.variantLabel ? (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '0.2rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.4rem',
                          borderRadius: 6,
                          background: '#eff6ff',
                          color: '#1d4ed8',
                        }}
                      >
                        {product.variantLabel}
                      </span>
                    ) : null}
                  </div>
                  {stockBadge ? (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.4rem',
                        borderRadius: 999,
                        background: stockBadge.isOutOfStock ? '#fee2e2' : '#ecfdf5',
                        color: stockBadge.isOutOfStock ? '#b91c1c' : '#166534',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {stockBadge.isOutOfStock ? 'Habis' : stockBadge.text.replace(/^Stok:\s*/, '')}
                    </span>
                  ) : null}
                </div>

                <div style={{ marginTop: 'auto' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: '#15803d',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatCurrencyIDR(displayUnit.price)}
                    {displayUnit.unitSymbol ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                        {' '}
                        / {displayUnit.unitSymbol}
                      </span>
                    ) : null}
                  </p>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                    {multiUnit ? (
                      <span style={{ fontSize: '0.68rem', color: '#64748b' }}>Multi-satuan</span>
                    ) : null}
                    {isBundle ? (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: '#7c3aed',
                          background: '#f5f3ff',
                          padding: '0.05rem 0.35rem',
                          borderRadius: 4,
                        }}
                      >
                        Paket
                      </span>
                    ) : null}
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{formatShortSku(product.sku)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && filteredProducts.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '0.875rem' }}>
          Produk tidak ditemukan. Coba kata kunci lain atau reset filter.
        </p>
      ) : null}
    </section>
  );
}
