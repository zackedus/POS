'use client';

import type { CSSProperties } from 'react';
import { dashboardTokens } from '@/components/dashboard/dashboard-ui';

export type FinanceTabId = 'ringkasan' | 'piutang' | 'utang' | 'aging' | 'deposit' | 'pengeluaran';

export const FINANCE_TABS: Array<{ id: FinanceTabId; label: string }> = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'piutang', label: 'Piutang' },
  { id: 'utang', label: 'Utang' },
  { id: 'aging', label: 'Aging' },
  { id: 'deposit', label: 'Deposit' },
  { id: 'pengeluaran', label: 'Pengeluaran' },
];

const TAB_ALIASES: Record<string, FinanceTabId> = {
  ringkasan: 'ringkasan',
  summary: 'ringkasan',
  piutang: 'piutang',
  receivables: 'piutang',
  utang: 'utang',
  payables: 'utang',
  aging: 'aging',
  deposit: 'deposit',
  deposits: 'deposit',
  pengeluaran: 'pengeluaran',
  expenses: 'pengeluaran',
};

export function parseFinanceTab(value: string | null | undefined): FinanceTabId {
  if (!value) return 'ringkasan';
  return TAB_ALIASES[value.toLowerCase()] ?? 'ringkasan';
}

export function financeTabHref(tab: FinanceTabId, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ tab });
  if (extra) {
    for (const [key, val] of Object.entries(extra)) {
      if (val) params.set(key, val);
    }
  }
  return `/dashboard/finance?${params.toString()}`;
}

export function FinanceTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: FinanceTabId;
  onTabChange: (tab: FinanceTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Modul keuangan"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        marginBottom: '1.25rem',
      }}
    >
      {FINANCE_TABS.map((tab) => {
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
