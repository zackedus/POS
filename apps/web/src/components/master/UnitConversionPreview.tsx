'use client';

import {
  formatConversionPreview,
  formatCurrencyIDR,
  formatMultiUnitPricingPreview,
  formatNumberID,
} from '@barokah/shared';

export interface UnitConversionPreviewProps {
  /** Purchase/receive quantity */
  purchaseQty?: number;
  purchaseSymbol?: string;
  conversionToBase?: number;
  baseSymbol?: string;
  /** Sell quantity & price for preview */
  sellQty?: number;
  sellSymbol?: string;
  sellPrice?: number;
  /** Base-unit cost for package cost preview */
  baseCostPrice?: number;
  /** Compact single-line or block layout */
  variant?: 'inline' | 'block';
  style?: React.CSSProperties;
}

/**
 * Human-readable math preview: "Beli: 10 dus → +250 kg stok | Jual: 2,5 kg @ Rp 18.000"
 */
export function UnitConversionPreview({
  purchaseQty,
  purchaseSymbol,
  conversionToBase,
  baseSymbol,
  sellQty,
  sellSymbol,
  sellPrice,
  baseCostPrice,
  variant = 'inline',
  style,
}: UnitConversionPreviewProps) {
  const parts: string[] = [];

  if (
    purchaseQty != null &&
    purchaseQty > 0 &&
    purchaseSymbol &&
    conversionToBase != null &&
    conversionToBase > 0 &&
    baseSymbol
  ) {
    parts.push(formatConversionPreview(purchaseQty, purchaseSymbol, conversionToBase, baseSymbol));
  }

  if (sellQty != null && sellQty > 0 && sellSymbol) {
    const sellPart = sellPrice != null && sellPrice > 0
      ? `Jual: ${formatNumberID(sellQty)} ${sellSymbol} @ ${formatCurrencyIDR(sellPrice)}`
      : `Jual: ${formatNumberID(sellQty)} ${sellSymbol}`;
    parts.push(sellPart);
  }

  const pricingPreview =
    purchaseSymbol &&
    baseSymbol &&
    conversionToBase != null &&
    conversionToBase > 0
      ? formatMultiUnitPricingPreview({
          purchaseSymbol,
          baseSymbol,
          conversionToBase,
          baseSellPrice: sellPrice,
          baseCostPrice,
        })
      : null;

  if (pricingPreview) {
    parts.push(pricingPreview);
  }

  if (parts.length === 0) {
    return null;
  }

  const text = parts.join(' | ');

  if (variant === 'block') {
    return (
      <div
        style={{
          padding: '0.625rem 0.75rem',
          borderRadius: 8,
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '0.85rem',
          ...style,
        }}
      >
        <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem' }}>Pratinjau</strong>
        {parts.map((part) => (
          <span key={part} style={{ display: 'block' }}>
            {part}
          </span>
        ))}
      </div>
    );
  }

  return (
    <span style={{ fontSize: '0.82rem', color: '#475569', ...style }}>
      {text}
    </span>
  );
}
