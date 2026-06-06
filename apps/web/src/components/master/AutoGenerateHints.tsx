'use client';

import type { CSSProperties } from 'react';

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.1rem 0.45rem',
  borderRadius: 999,
  fontSize: '0.65rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
  background: '#ecfdf5',
  color: '#047857',
  border: '1px solid #bbf7d0',
};

const helperStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.75rem',
  color: '#64748b',
};

export function AutoGenerateBadge() {
  return <span style={badgeStyle}>Otomatis</span>;
}

export function AutoGenerateHelper({ children }: { children: string }) {
  return <p style={helperStyle}>{children}</p>;
}

export function autoFieldLabelStyle(): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    flexWrap: 'wrap',
  };
}
