'use client';

import Link from 'next/link';
import React, { useState, type CSSProperties } from 'react';
import { Button } from '@barokah/ui';

/** Shared admin dashboard tokens aligned with DESIGN-SYSTEM.md */
export const dashboardTokens = {
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  } as const,
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  } as const,
  muted: '#64748b',
  text: '#0f172a',
  primary: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  success: '#16a34a',
};

export function cardStyle(overrides?: CSSProperties): CSSProperties {
  return { ...dashboardTokens.card, ...overrides };
}

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

const alertStyles: Record<AlertVariant, CSSProperties> = {
  error: { background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' },
  success: { background: '#f0fdf4', borderColor: '#86efac', color: '#166534' },
  warning: { background: '#fffbeb', borderColor: '#fcd34d', color: '#92400e' },
  info: { background: '#eff6ff', borderColor: '#bfdbfe', color: '#1e40af' },
};

export function AlertBanner({
  variant,
  children,
  onRetry,
  retryLabel = 'Coba lagi',
}: {
  variant: AlertVariant;
  children: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{ ...cardStyle({ marginBottom: '1rem' }), ...alertStyles[variant] }}
    >
      <div style={{ fontSize: '0.9375rem' }}>{children}</div>
      {onRetry ? (
        <div style={{ marginTop: '0.75rem' }}>
          <Button type="button" variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function BreadcrumbNav({ items }: { items: Array<{ label: string; href?: string }> }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '0.5rem', fontSize: '0.8125rem' }}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {index > 0 ? <span style={{ color: '#cbd5e1' }}>/</span> : null}
            {item.href ? (
              <Link href={item.href} style={{ color: dashboardTokens.primary, textDecoration: 'none' }}>
                {item.label}
              </Link>
            ) : (
              <span style={{ color: dashboardTokens.muted }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  helpText,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  helpText?: string;
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {breadcrumbs && breadcrumbs.length > 0 ? <BreadcrumbNav items={breadcrumbs} /> : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: dashboardTokens.text, fontWeight: 600 }}>{title}</h2>
          {description ? (
            <p style={{ margin: '0.35rem 0 0', color: dashboardTokens.muted, fontSize: '0.9375rem', maxWidth: '640px' }}>
              {description}
            </p>
          ) : null}
          {helpText ? <HelpTooltip text={helpText} /> : null}
        </div>
        {actions ? <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div> : null}
      </div>
    </div>
  );
}

export function HelpTooltip({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: '0.5rem 0 0',
        padding: '0.5rem 0.75rem',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#475569',
        fontSize: '0.8125rem',
        maxWidth: '640px',
      }}
    >
      <span aria-hidden style={{ marginRight: '0.35rem' }}>
        ℹ
      </span>
      {text}
    </p>
  );
}

export function SectionCard({
  title,
  description,
  children,
  style,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section style={{ ...cardStyle(), marginBottom: '1.5rem', ...style }}>
      {title ? <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.125rem', color: dashboardTokens.text }}>{title}</h3> : null}
      {description ? (
        <p style={{ margin: title ? '0 0 1rem' : '0 0 1rem', color: dashboardTokens.muted, fontSize: '0.875rem' }}>
          {description}
        </p>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = 'default',
  ariaLabel,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: 'default' | 'success' | 'warning' | 'error';
  ariaLabel?: string;
}) {
  const valueColors: Record<string, string> = {
    default: dashboardTokens.text,
    success: dashboardTokens.success,
    warning: dashboardTokens.warning,
    error: dashboardTokens.error,
  };
  return (
    <article style={cardStyle()} aria-label={ariaLabel ?? label}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: dashboardTokens.muted }}>{label}</p>
      <p
        style={{
          margin: '0.5rem 0 0',
          fontSize: '1.75rem',
          fontWeight: 700,
          color: valueColors[accent],
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      {hint ? <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: dashboardTokens.muted }}>{hint}</p> : null}
    </article>
  );
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: string;
}) {
  return (
    <div style={{ ...cardStyle(), textAlign: 'center', padding: '2.5rem 1.25rem' }}>
      {icon ? (
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.6 }} aria-hidden>
          {icon}
        </div>
      ) : null}
      <p style={{ margin: 0, fontWeight: 600, color: dashboardTokens.text, fontSize: '1rem' }}>{title}</p>
      <p style={{ margin: '0.5rem auto 0', color: dashboardTokens.muted, fontSize: '0.9375rem', maxWidth: '360px' }}>
        {description}
      </p>
      {actionHref && actionLabel ? (
        <div style={{ marginTop: '1.25rem' }}>
          <Link
            href={actionHref}
            style={{
              display: 'inline-block',
              padding: '0.625rem 1.25rem',
              borderRadius: '8px',
              background: dashboardTokens.primary,
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
          >
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div
      suppressHydrationWarning
      style={{ display: 'grid', gap: '0.75rem' }}
      aria-busy="true"
      aria-label="Memuat data"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 48,
            borderRadius: 8,
            background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
            backgroundSize: '200% 100%',
            animation: 'dashboard-shimmer 1.2s ease-in-out infinite',
          }}
        />
      ))}
      <style>{`
        @keyframes dashboard-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function StatusBadge({
  label,
  variant = 'neutral',
}: {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'info';
}) {
  const styles: Record<string, CSSProperties> = {
    success: { background: '#dcfce7', color: '#166534' },
    warning: { background: '#fef3c7', color: '#92400e' },
    error: { background: '#fee2e2', color: '#b91c1c' },
    info: { background: '#dbeafe', color: '#1e40af' },
    neutral: { background: '#f1f5f9', color: '#64748b' },
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        ...styles[variant],
      }}
    >
      {label}
    </span>
  );
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.875rem',
        color: dashboardTokens.muted,
      }}
    >
      <span>
        Menampilkan {from}–{to} dari {totalItems}
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </Button>
        <span style={{ alignSelf: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {page} / {totalPages}
        </span>
        <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}

export function useClientPagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    page: safePage,
    totalPages,
    pageItems,
    setPage,
    totalItems: items.length,
    pageSize,
  };
}

export const tableStyles = {
  card: cardStyle(),
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: '0.875rem' },
  th: {
    padding: '0.65rem 0.75rem',
    color: dashboardTokens.muted,
    fontWeight: 600,
    textAlign: 'left' as const,
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
  },
  td: { padding: '0.65rem 0.75rem', color: '#334155' },
  row: { borderBottom: '1px solid #f1f5f9' },
  headRow: { borderBottom: '1px solid #e2e8f0' },
};

export function DataTable({
  children,
  stickyHeader = true,
}: {
  children: React.ReactNode;
  stickyHeader?: boolean;
}) {
  return (
    <>
      <style>{`
        .barokah-data-table tbody tr:nth-child(even) { background: #fafbfc; }
        .barokah-data-table tbody tr:hover { background: #f0fdf4; }
        .barokah-data-table tbody tr { transition: background 0.12s ease; }
        ${
          stickyHeader
            ? `.barokah-data-table thead th { position: sticky; top: 0; z-index: 1; box-shadow: 0 1px 0 #e2e8f0; }`
            : ''
        }
      `}</style>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
        <table className="barokah-data-table" style={tableStyles.table}>
          {children}
        </table>
      </div>
    </>
  );
}

const dateInputStyle: CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '0.9375rem',
  background: '#fff',
};

export function ReportDateFilters({
  mode,
  onModeChange,
  singleDate,
  onSingleDateChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: {
  mode: 'single' | 'range';
  onModeChange: (mode: 'single' | 'range') => void;
  singleDate: string;
  onSingleDateChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '0.75rem' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
        <span style={{ color: dashboardTokens.muted }}>Mode laporan</span>
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as 'single' | 'range')}
          style={dateInputStyle}
        >
          <option value="single">Harian</option>
          <option value="range">Rentang tanggal</option>
        </select>
      </label>
      {mode === 'single' ? (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          <span style={{ color: dashboardTokens.muted }}>Tanggal</span>
          <input type="date" value={singleDate} onChange={(e) => onSingleDateChange(e.target.value)} style={dateInputStyle} />
        </label>
      ) : (
        <>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            <span style={{ color: dashboardTokens.muted }}>Dari</span>
            <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} style={dateInputStyle} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
            <span style={{ color: dashboardTokens.muted }}>Sampai</span>
            <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} style={dateInputStyle} />
          </label>
        </>
      )}
    </div>
  );
}
