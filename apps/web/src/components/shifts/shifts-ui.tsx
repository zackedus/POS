'use client';

import type { CSSProperties } from 'react';
import { dashboardTokens } from '@/components/dashboard/dashboard-ui';

export type ShiftTabId = 'aktif' | 'riwayat';

export const SHIFT_TABS: Array<{ id: ShiftTabId; label: string }> = [
  { id: 'aktif', label: 'Shift Aktif' },
  { id: 'riwayat', label: 'Riwayat' },
];

const TAB_ALIASES: Record<string, ShiftTabId> = {
  aktif: 'aktif',
  active: 'aktif',
  riwayat: 'riwayat',
  history: 'riwayat',
};

export function parseShiftTab(value: string | null | undefined): ShiftTabId {
  if (!value) return 'aktif';
  return TAB_ALIASES[value.toLowerCase()] ?? 'aktif';
}

export function shiftTabHref(tab: ShiftTabId, extra?: Record<string, string>, basePath = '/shift'): string {
  const params = new URLSearchParams({ tab });
  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      if (val) params.set(key, val);
    }
  }
  return `${basePath}?${params.toString()}`;
}

export function ShiftTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: ShiftTabId;
  onTabChange: (tab: ShiftTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Modul shift"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1.25rem',
      }}
    >
      {SHIFT_TABS.map((tab) => {
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

export function ShiftStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.2rem 0.65rem',
        borderRadius: 999,
        fontSize: '0.75rem',
        fontWeight: 700,
        background: active ? '#dcfce7' : '#f1f5f9',
        color: active ? '#166534' : '#64748b',
        border: `1px solid ${active ? '#86efac' : '#e2e8f0'}`,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: active ? '#16a34a' : '#94a3b8',
        }}
      />
      {active ? 'Shift Aktif' : 'Tutup'}
    </span>
  );
}
