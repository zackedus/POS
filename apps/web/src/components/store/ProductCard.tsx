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
}

export function ProductCard({
  slug,
  productId,
  name,
  price,
  unitSymbol,
  stockStatus,
}: ProductCardProps) {
  const outOfStock = stockStatus === 'OUT_OF_STOCK';

  return (
    <Link
      href={`/store/${slug}/p/${productId}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        border: `1px solid ${colors.light.border.default}`,
        overflow: 'hidden',
        textDecoration: 'none',
        color: colors.light.text.primary,
        opacity: outOfStock ? 0.6 : 1,
        minHeight: 200,
      }}
    >
      <div
        style={{
          aspectRatio: '1',
          background: colors.light.bg.muted,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
        }}
      >
        🏗️
      </div>
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span
          style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: '1rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(price)}
          <span style={{ fontSize: '0.75rem', fontWeight: 400, color: colors.light.text.secondary }}>
            {' '}
            /{unitSymbol}
          </span>
        </span>
        <span
          style={{
            fontSize: '0.75rem',
            color: outOfStock ? colors.light.text.secondary : colors.semantic.success,
          }}
        >
          {outOfStock ? '○ Habis' : '● Tersedia'}
        </span>
      </div>
    </Link>
  );
}
