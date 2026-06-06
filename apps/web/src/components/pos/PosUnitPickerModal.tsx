'use client';

import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import type { ProductGridItem } from './pos-types';
import { isOutOfStock } from '@/lib/pos-stock-display';

export interface PosUnitPickerModalProps {
  product: ProductGridItem | null;
  onClose: () => void;
  onSelect: (sellUnitId: string) => void;
}

export function PosUnitPickerModal({ product, onClose, onSelect }: PosUnitPickerModalProps) {
  if (!product?.sellUnits?.length) {
    return null;
  }

  const outOfStock = isOutOfStock(product.stockQty);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-unit-picker-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.45)',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(480px, 100%)',
          background: '#fff',
          borderRadius: '16px 16px 12px 12px',
          padding: '1rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="pos-unit-picker-title" style={{ margin: '0 0 0.25rem', fontSize: '1.05rem' }}>
          Pilih satuan jual
        </h3>
        <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
          {product.name}
          {product.variantLabel ? ` · ${product.variantLabel}` : ''}
        </p>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {product.sellUnits.map((unit) => (
            <button
              key={unit.id}
              type="button"
              disabled={outOfStock}
              onClick={() => {
                onSelect(unit.id);
                onClose();
              }}
              style={{
                minHeight: 52,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                border: '1px solid #e2e8f0',
                background: outOfStock ? '#f8fafc' : '#fff',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
                textAlign: 'left',
              }}
            >
              <span>
                <strong style={{ color: '#0f172a' }}>{unit.name}</strong>
                <span style={{ marginLeft: '0.35rem', color: '#64748b', fontSize: '0.8125rem' }}>
                  ({unit.symbol})
                </span>
              </span>
              <strong style={{ color: '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrencyIDR(unit.price)}
              </strong>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="ghost" onClick={onClose} style={{ minHeight: 44 }}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
