'use client';

import {
  SALE_SOURCE_TYPE_BADGE,
  type SaleSourceType,
} from '@barokah/shared';

export function SaleSourceBadge({ sourceType, label }: { sourceType: SaleSourceType; label: string }) {
  const style = SALE_SOURCE_TYPE_BADGE[sourceType];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        background: style.bg,
        color: style.color,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden>{style.icon}</span>
      {label}
    </span>
  );
}

export function saleDisplayStatusVariant(
  displayStatus: string,
): 'success' | 'error' | 'warning' | 'neutral' {
  if (displayStatus === 'COMPLETED') return 'success';
  if (displayStatus === 'VOID' || displayStatus === 'CANCELLED') return 'error';
  if (displayStatus === 'REFUND' || displayStatus === 'PARTIAL') return 'warning';
  return 'neutral';
}
