'use client';

import type { CSSProperties } from 'react';
import { dashboardTokens } from '@/components/dashboard/dashboard-ui';

export type UsersTabId = 'pengguna' | 'roles';

export const USERS_TABS: Array<{ id: UsersTabId; label: string }> = [
  { id: 'pengguna', label: 'Pengguna' },
  { id: 'roles', label: 'Peran & Izin' },
];

const TAB_ALIASES: Record<string, UsersTabId> = {
  pengguna: 'pengguna',
  users: 'pengguna',
  roles: 'roles',
  peran: 'roles',
};

export function parseUsersTab(value: string | null | undefined): UsersTabId {
  if (!value) return 'pengguna';
  return TAB_ALIASES[value.toLowerCase()] ?? 'pengguna';
}

export function UsersTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: UsersTabId;
  onTabChange: (tab: UsersTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Manajemen pengguna"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1.25rem',
      }}
    >
      {USERS_TABS.map((tab) => {
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
