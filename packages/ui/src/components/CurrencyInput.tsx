'use client';

import { useEffect, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import {
  formatCurrencyAmountOnly,
  parseCurrencyInput,
} from '@barokah/shared';
import { colors } from '../tokens/colors';

export interface CurrencyInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** Numeric string for API/forms, e.g. "75000". Empty string when unset. */
  value: string;
  onChange: (value: string) => void;
}

export function CurrencyInput({
  label,
  error,
  fullWidth = false,
  value,
  onChange,
  disabled,
  placeholder = '0',
  id,
  style,
  ...props
}: CurrencyInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (focused) {
      return;
    }
    const parsed = parseCurrencyInput(value);
    setText(value.trim() === '' && parsed === 0 ? '' : formatCurrencyAmountOnly(parsed));
  }, [value, focused]);

  const inputStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: `1px solid ${error ? colors.semantic.error : colors.light.border.default}`,
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontVariantNumeric: 'tabular-nums',
    ...style,
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        width: fullWidth ? '100%' : undefined,
      }}
    >
      {label ? (
        <label htmlFor={inputId} style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.light.text.primary }}>
          {label}
        </label>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: fullWidth ? '100%' : undefined,
          borderRadius: '8px',
          border: `1px solid ${error ? colors.semantic.error : colors.light.border.default}`,
          overflow: 'hidden',
          background: disabled ? '#f8fafc' : '#fff',
        }}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#475569',
            background: '#f8fafc',
            borderRight: `1px solid ${error ? colors.semantic.error : colors.light.border.default}`,
            flexShrink: 0,
          }}
        >
          Rp
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          style={{ ...inputStyle, border: 'none', borderRadius: 0 }}
          onFocus={() => {
            setFocused(true);
            const parsed = parseCurrencyInput(value || text);
            setText(parsed > 0 ? String(parsed) : '');
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = parseCurrencyInput(text);
            onChange(parsed > 0 ? String(parsed) : '');
          }}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            if (next.includes(',')) {
              const fraction = next.slice(next.lastIndexOf(',') + 1);
              if (fraction.length > 0 && !/^0+$/.test(fraction)) {
                onChange(next);
                return;
              }
            }
            if (/\.\d{1,2}$/.test(next.replace(/\s/g, ''))) {
              onChange(next);
              return;
            }
            const parsed = parseCurrencyInput(next);
            onChange(parsed > 0 ? String(parsed) : '');
          }}
          {...props}
        />
      </div>
      {error ? <span style={{ fontSize: '0.75rem', color: colors.semantic.error }}>{error}</span> : null}
    </div>
  );
}
