'use client';

import React, { useState } from 'react';

export interface PosAccordionSectionProps {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function PosAccordionSection({
  title,
  badge,
  defaultOpen = false,
  children,
}: PosAccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ marginTop: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem',
          minHeight: 44,
          padding: '0.35rem 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{title}</strong>
          {badge != null && badge !== '' ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 999,
                background: '#f1f5f9',
                color: '#475569',
              }}
            >
              {badge}
            </span>
          ) : null}
        </span>
        <span aria-hidden style={{ color: '#64748b', fontSize: '0.75rem' }}>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div style={{ marginTop: '0.5rem' }}>{children}</div> : null}
    </section>
  );
}
