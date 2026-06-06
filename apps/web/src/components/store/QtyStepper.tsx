'use client';

import type { CSSProperties } from 'react';
import { colors } from '@barokah/ui';

interface QtyStepperProps {
  value: number;
  min?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function QtyStepper({ value, min = 1, onChange, disabled }: QtyStepperProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        aria-label="Kurangi jumlah"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        style={stepperBtnStyle}
      >
        −
      </button>
      <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Tambah jumlah"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        style={stepperBtnStyle}
      >
        +
      </button>
    </div>
  );
}

const stepperBtnStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 8,
  border: `1px solid ${colors.light.border.default}`,
  background: colors.light.bg.base,
  fontSize: '1.25rem',
  cursor: 'pointer',
};
