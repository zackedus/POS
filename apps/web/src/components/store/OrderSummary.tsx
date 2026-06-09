'use client';

import type { CSSProperties } from 'react';
import { calculateOnlineCodSplit, formatCurrency } from '@barokah/shared';
import { colors } from '@barokah/ui';

interface OrderSummaryProps {
  subtotal: number;
  tax: number;
  total: number;
  shippingFee?: number;
  paymentMode?: 'FULL_ONLINE' | 'COD';
}

export function OrderSummary({ subtotal, tax, total, shippingFee = 0, paymentMode = 'FULL_ONLINE' }: OrderSummaryProps) {
  const codSplit = paymentMode === 'COD' ? calculateOnlineCodSplit(total) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={rowStyle}>
        <span>Subtotal</span>
        <span style={numStyle}>{formatCurrency(subtotal)}</span>
      </div>
      {shippingFee > 0 ? (
        <div style={rowStyle}>
          <span>Ongkir</span>
          <span style={numStyle}>{formatCurrency(shippingFee)}</span>
        </div>
      ) : null}
      <div style={rowStyle}>
        <span>PPN 11%</span>
        <span style={numStyle}>{formatCurrency(tax)}</span>
      </div>
      <div
        style={{
          ...rowStyle,
          paddingTop: '0.5rem',
          borderTop: `1px solid ${colors.light.border.default}`,
          fontWeight: 700,
          fontSize: '1.0625rem',
        }}
      >
        <span>TOTAL</span>
        <span style={numStyle}>{formatCurrency(total)}</span>
      </div>
      {codSplit ? (
        <>
          <div style={{ ...rowStyle, color: colors.primary[700], fontWeight: 600 }}>
            <span>Uang muka 20% (bayar sekarang)</span>
            <span style={numStyle}>{formatCurrency(codSplit.depositAmount)}</span>
          </div>
          <div style={{ ...rowStyle, color: colors.light.text.secondary }}>
            <span>Sisa bayar saat terima (80%)</span>
            <span style={numStyle}>{formatCurrency(codSplit.balanceDue)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.9375rem',
  color: colors.light.text.primary,
};

const numStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums' };
