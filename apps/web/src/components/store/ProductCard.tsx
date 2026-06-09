'use client';

import Link from 'next/link';
import { formatCurrency } from '@barokah/shared';
import { colors } from '@barokah/ui';
import type { StockStatus } from '@/lib/store/types';

interface ProductCardProps {
  slug: string;
  productId: string;
  name: string;
  price: number;
  unitSymbol: string;
  stockStatus: StockStatus;
  accentColor?: string;
}

export function ProductCard({
  slug,
  productId,
  name,
  price,
  unitSymbol,
  stockStatus,
  accentColor = colors.primary[700],
}: ProductCardProps) {
  const outOfStock = stockStatus === 'OUT_OF_STOCK';

  return (
    <Link
      href={`/store/${slug}/products/${productId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 10,
        border: `1px solid ${colors.light.border.default}`,
        overflow: 'hidden',
        textDecoration: 'none',
        color: colors.light.text.primary,
        opacity: outOfStock ? 0.55 : 1,
        minHeight: 132,
        background: colors.light.bg.base,
      }}
    >
      <div
        style={{
          height: 56,
          background: colors.light.bg.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
        }}
        aria-hidden
      >
        🏗️
      </div>
      <div style={{ padding: '0.625rem 0.7rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
        <span
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </span>
        <span
          style={{
            marginTop: 'auto',
            fontSize: '0.9375rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            color: accentColor,
          }}
        >
          {formatCurrency(price)}
          <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: colors.light.text.secondary }}>
            {' '}
            /{unitSymbol}
          </span>
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: outOfStock ? colors.light.text.secondary : colors.semantic.success,
          }}
        >
          {outOfStock ? 'Habis' : 'Tersedia'}
        </span>
      </div>
    </Link>
  );
}
