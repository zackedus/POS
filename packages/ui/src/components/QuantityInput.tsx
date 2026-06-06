'use client';

import { useEffect, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { formatNumberID, parseQuantityInput } from '@barokah/shared';
import { colors } from '../tokens/colors';

export interface QuantityInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  /** Numeric string for API/forms, e.g. "1.5". Empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  decimals?: number;
}

function toApiQuantityString(parsed: number): string {
  if (!Number.isFinite(parsed) || parsed === 0) {
    return '';
  }
  return String(parsed);
}

export function QuantityInput({
  label,
  error,
  fullWidth = false,
  value,
  onChange,
  disabled,
  placeholder = '0,5',
  decimals,
  id,
  style,
  ...props
}: QuantityInputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (focused) {
      return;
    }
    const parsed = value.trim() === '' ? 0 : parseFloat(value);
    setText(
      value.trim() === '' || !Number.isFinite(parsed) || parsed === 0
        ? ''
        : formatNumberID(parsed, decimals),
    );
  }, [value, focused, decimals]);

  const inputStyle: CSSProperties = {
    width: fullWidth ? '100%' : undefined,
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
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={text}
        style={inputStyle}
        onFocus={() => {
          setFocused(true);
          const parsed = value.trim() === '' ? parseQuantityInput(text) : parseFloat(value);
          setText(Number.isFinite(parsed) && parsed > 0 ? String(parsed).replace('.', ',') : text);
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseQuantityInput(text);
          onChange(toApiQuantityString(parsed));
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = parseQuantityInput(next);
          onChange(toApiQuantityString(parsed));
        }}
        {...props}
      />
      {error ? <span style={{ fontSize: '0.75rem', color: colors.semantic.error }}>{error}</span> : null}
    </div>
  );
}
