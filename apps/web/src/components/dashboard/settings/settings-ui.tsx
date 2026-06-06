'use client';

import type { CSSProperties } from 'react';
import { dashboardTokens } from '@/components/dashboard/dashboard-ui';

export type SettingsTabId =
  | 'toko'
  | 'kasir'
  | 'loyalty'
  | 'promo'
  | 'pembayaran'
  | 'online'
  | 'outlet';

export const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: 'toko', label: 'Toko & Tenant' },
  { id: 'kasir', label: 'Kasir & POS' },
  { id: 'loyalty', label: 'Loyalty' },
  { id: 'promo', label: 'Promo' },
  { id: 'pembayaran', label: 'Pembayaran' },
  { id: 'online', label: 'Online / Storefront' },
  { id: 'outlet', label: 'Outlet' },
];

export function SettingsTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTabId;
  onTabChange: (tab: SettingsTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Bagian pengaturan"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1.25rem',
      }}
    >
      {SETTINGS_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const style: CSSProperties = {
          padding: '0.625rem 1rem',
          borderRadius: 999,
          border: `1px solid ${isActive ? dashboardTokens.primary : '#e2e8f0'}`,
          background: isActive ? '#f0fdf4' : '#fff',
          color: isActive ? '#166534' : dashboardTokens.text,
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.875rem',
          cursor: 'pointer',
          minHeight: 44,
        };
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            style={style}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsFieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gap: '0.75rem', fontSize: '0.9375rem' }}>{children}</dl>
  );
}

export function SettingsFieldRow({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 180px) 1fr', gap: '0.5rem' }}>
      <dt style={{ color: dashboardTokens.muted, paddingTop: hint ? 0 : '0.35rem' }}>{label}</dt>
      <dd style={{ margin: 0 }}>
        {children}
        {hint ? (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8125rem', color: dashboardTokens.muted }}>{hint}</p>
        ) : null}
      </dd>
    </div>
  );
}

export function inputStyle(borderColor = '#e2e8f0'): CSSProperties {
  return {
    padding: '0.5rem 0.75rem',
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    fontSize: '0.9375rem',
    width: '100%',
    maxWidth: 320,
    minHeight: 44,
  };
}

export function roleLabel(role: string): string {
  if (role === 'OWNER') return 'Pemilik';
  if (role === 'MANAGER') return 'Manajer';
  if (role === 'CASHIER') return 'Kasir';
  return role;
}

export function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    value,
  );
}
