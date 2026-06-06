import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { colors } from '../tokens/colors';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  fullWidth = false,
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, CSSProperties> = {
    primary: {
      background: colors.primary[500],
      color: colors.light.text.inverse,
    },
    secondary: {
      background: colors.light.bg.muted,
      color: colors.light.text.primary,
      border: `1px solid ${colors.light.border.default}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.primary[600],
    },
  };

  const baseStyle: CSSProperties = {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    fontWeight: 600,
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.6 : 1,
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button type="button" style={baseStyle} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
