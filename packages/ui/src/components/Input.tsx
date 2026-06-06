import type { InputHTMLAttributes, CSSProperties } from 'react';
import { colors } from '../tokens/colors';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export function Input({ label, error, fullWidth = false, style, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  const inputStyle: CSSProperties = {
    width: fullWidth ? '100%' : undefined,
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: `1px solid ${error ? colors.semantic.error : colors.light.border.default}`,
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: fullWidth ? '100%' : undefined }}>
      {label ? (
        <label htmlFor={inputId} style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.light.text.primary }}>
          {label}
        </label>
      ) : null}
      <input id={inputId} style={inputStyle} {...props} />
      {error ? (
        <span style={{ fontSize: '0.75rem', color: colors.semantic.error }}>{error}</span>
      ) : null}
    </div>
  );
}
