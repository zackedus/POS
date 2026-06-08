'use client';

import { useMemo, type CSSProperties } from 'react';
import { formatCurrencyIDR, matchesProductSearch } from '@barokah/shared';
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
  fontSize: '0.8125rem',
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
    const keyword = search.trim();
    return products.filter((product) => {
      if (selectedCategoryId && product.category?.id !== selectedCategoryId) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return matchesProductSearch(
        {
          name: product.name,
          sku: product.sku,
          variantLabel: product.variantLabel,
          barcode: (product as { barcode?: string | null }).barcode,
        },
        keyword,
      );
    });
  }, [products, search, selectedCategoryId, useServerFilter]);

  return (
    <section style={{ padding: '0.625rem 0.875rem 0.875rem', background: '#f8fafc', overflow: 'auto', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          marginBottom: '0.625rem',
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
        <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
          {loading ? 'Memuat…' : `${filteredProducts.length} produk`}
        </span>
      </div>

      {categories.length > 0 ? (
        <div
          role="group"
          aria-label="Filter kategori"
          style={{
            display: 'flex',
            gap: '0.35rem',
            overflowX: 'auto',
            paddingBottom: '0.4rem',
            marginBottom: '0.4rem',
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
            marginBottom: '0.625rem',
            color: '#991b1b',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '0.5rem 0.65rem',
            fontSize: '0.8125rem',
          }}
        >
          {stockAlert}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            marginBottom: '0.625rem',
            color: '#b91c1c',
            background: '#fee2e2',
            borderRadius: 8,
            padding: '0.5rem 0.65rem',
            fontSize: '0.8125rem',
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
        <p style={{ color: '#64748b', fontSize: '0.8125rem' }}>Memuat produk…</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '0.5rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(152px, 1fr))',
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
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '0.625rem 0.7rem',
                  background: productOutOfStock ? '#f8fafc' : '#fff',
                  textAlign: 'left',
                  cursor: productOutOfStock ? 'not-allowed' : 'pointer',
                  minHeight: 96,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  opacity: productOutOfStock ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.35rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        color: productOutOfStock ? '#64748b' : '#0f172a',
                        lineHeight: 1.25,
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
                          marginTop: '0.15rem',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.05rem 0.35rem',
                          borderRadius: 4,
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
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
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
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#15803d',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {formatCurrencyIDR(displayUnit.price)}
                    {displayUnit.unitSymbol ? (
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b' }}>
                        {' '}
                        /{displayUnit.unitSymbol}
                      </span>
                    ) : null}
                  </p>
                  {(isBundle || multiUnit) ? (
                    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.15rem' }}>
                      {isBundle ? (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: '#7c3aed',
                            background: '#f5f3ff',
                            padding: '0.05rem 0.3rem',
                            borderRadius: 4,
                          }}
                        >
                          Paket
                        </span>
                      ) : null}
                      {multiUnit ? (
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f1f5f9',
                            padding: '0.05rem 0.3rem',
                            borderRadius: 4,
                          }}
                        >
                          Multi
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span
                      style={{
                        display: 'block',
                        marginTop: '0.1rem',
                        fontSize: '0.625rem',
                        color: '#cbd5e1',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {formatShortSku(product.sku)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && filteredProducts.length === 0 ? (
        <p style={{ color: '#64748b', marginTop: '0.625rem', fontSize: '0.8125rem' }}>
          Produk tidak ditemukan.
        </p>
      ) : null}
    </section>
  );
}
