'use client';

import React, { useState } from 'react';
import { Button, Input } from '@barokah/ui';
import { SectionCard } from '@/components/dashboard/dashboard-ui';

export type FilterSelectOption = { value: string; label: string };

export type FilterSelectField = {
  id: string;
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  minWidth?: number;
  'aria-label'?: string;
};

export type FilterToggleField = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export type FilterChip = { key: string; label: string };

export type ListFilterBarProps = {
  title?: string;
  selects?: FilterSelectField[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  showDateRange?: boolean;
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  toggles?: FilterToggleField[];
  onApply?: () => void;
  onReset?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  activeChips?: FilterChip[];
  collapsible?: boolean;
  children?: React.ReactNode;
};

const fieldLabelStyle = { fontSize: 13, color: '#475569', fontWeight: 600 } as const;
const selectStyle = {
  minHeight: 44,
  padding: '0.5rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  minWidth: 160,
  background: '#fff',
} as const;

export function ListFilterBar({
  title = 'Filter',
  selects = [],
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showDateRange = true,
  search,
  searchPlaceholder = 'Cari…',
  onSearchChange,
  toggles = [],
  onApply,
  onReset,
  applyLabel = 'Terapkan',
  resetLabel = 'Reset filter',
  activeChips = [],
  collapsible = true,
  children,
}: ListFilterBarProps) {
  const [expanded, setExpanded] = useState(true);
  const hasDate = showDateRange && onDateFromChange && onDateToChange;
  const hasSearch = onSearchChange !== undefined;

  const filterBody = (
    <div style={{ display: 'grid', gap: 12 }}>
      {selects.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'end' }}>
          {selects.map((field) => (
            <label key={field.id} style={{ display: 'grid', gap: 4, minWidth: field.minWidth ?? 160 }}>
              <span style={fieldLabelStyle}>{field.label}</span>
              <select
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                aria-label={field['aria-label'] ?? field.label}
                style={{ ...selectStyle, minWidth: field.minWidth ?? selectStyle.minWidth }}
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {toggles.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {toggles.map((toggle) => (
            <label
              key={toggle.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={toggle.checked}
                onChange={(event) => toggle.onChange(event.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, color: '#334155' }}>{toggle.label}</span>
            </label>
          ))}
        </div>
      ) : null}

      {children}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8,
          alignItems: 'end',
        }}
      >
        {hasDate ? (
          <>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={fieldLabelStyle}>Dari tanggal</span>
              <Input type="date" value={dateFrom ?? ''} onChange={(e) => onDateFromChange(e.target.value)} />
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={fieldLabelStyle}>Sampai tanggal</span>
              <Input type="date" value={dateTo ?? ''} onChange={(e) => onDateToChange(e.target.value)} />
            </label>
          </>
        ) : null}
        {hasSearch ? (
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={fieldLabelStyle}>Pencarian</span>
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onApply?.();
              }}
            />
          </label>
        ) : null}
        {onApply || onReset ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {onApply ? (
              <Button type="button" onClick={onApply} style={{ minHeight: 44 }}>
                {applyLabel}
              </Button>
            ) : null}
            {onReset ? (
              <Button type="button" variant="secondary" onClick={onReset} style={{ minHeight: 44 }}>
                {resetLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeChips.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Filter aktif:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: '#ecfdf5',
                color: '#166534',
                border: '1px solid #bbf7d0',
              }}
            >
              {chip.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!collapsible) {
    return (
      <SectionCard title={title}>
        {filterBody}
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title}>
      <div style={{ display: 'grid', gap: 8 }}>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          style={{
            minHeight: 44,
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          {expanded ? 'Sembunyikan filter' : 'Tampilkan filter'}
        </button>
        {expanded ? filterBody : null}
      </div>
    </SectionCard>
  );
}

/** Empty state message when filters yield no results. */
export const FILTER_EMPTY_DESCRIPTION = 'Tidak ada data — coba ubah filter.';
