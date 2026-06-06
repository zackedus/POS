'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, colors } from '@barokah/ui';
import type { ShiftSummary } from '@/lib/shifts-api';

const navLinkStyle = (active: boolean) => ({
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 44,
  padding: '0 0.875rem',
  borderRadius: 8,
  textDecoration: 'none' as const,
  fontSize: '0.875rem',
  fontWeight: 600,
  color: active ? colors.primary[700] : colors.light.text.primary,
  background: active ? colors.primary[50] : 'transparent',
  border: `1px solid ${active ? colors.primary[600] : colors.light.border.default}`,
  transition: 'background 0.12s ease, border-color 0.12s ease',
});

export interface PosOutletOption {
  id: string;
  label: string;
}

export interface PosShiftBarProps {
  userName: string;
  activeShift: ShiftSummary | null;
  onlineOrderCount?: number;
  outlets?: PosOutletOption[];
  selectedOutletId?: string | null;
  needsOutletPick?: boolean;
  shiftOutletMismatch?: boolean;
  onOutletChange?: (outletId: string) => void;
  onLogout: () => void;
}

function formatShiftTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function PosShiftBar({
  userName,
  activeShift,
  onlineOrderCount,
  outlets = [],
  selectedOutletId,
  needsOutletPick = false,
  shiftOutletMismatch = false,
  onOutletChange,
  onLogout,
}: PosShiftBarProps) {
  const pathname = usePathname();
  const shiftOpen = Boolean(activeShift);
  const showOutletPicker = outlets.length > 1;
  const selectedOutletLabel =
    outlets.find((o) => o.id === selectedOutletId)?.label ??
    (selectedOutletId ? selectedOutletId.slice(-6) : null);

  return (
    <>
      {needsOutletPick ? (
        <div
          role="alert"
          style={{
            padding: '0.5rem 1rem',
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          <strong>Pilih cabang aktif</strong> sebelum transaksi — gunakan selector cabang di header.
        </div>
      ) : null}
      {shiftOutletMismatch ? (
        <div
          role="alert"
          style={{
            padding: '0.5rem 1rem',
            background: '#fff7ed',
            borderBottom: '1px solid #fed7aa',
            color: '#9a3412',
            fontSize: '0.875rem',
          }}
        >
          Shift aktif di cabang lain. Buka shift di <strong>{selectedOutletLabel ?? 'cabang terpilih'}</strong> atau
          ganti cabang aktif.
        </div>
      ) : null}
      <div
        role="status"
        style={{
          padding: '0.5rem 1rem',
          background: shiftOpen ? '#f0fdf4' : '#fffbeb',
          borderBottom: `1px solid ${shiftOpen ? '#bbf7d0' : '#fcd34d'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          fontSize: '0.875rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: shiftOpen ? '#16a34a' : '#d97706',
              flexShrink: 0,
            }}
            aria-hidden
          />
          <strong style={{ color: shiftOpen ? '#166534' : '#92400e' }}>
            {shiftOpen ? 'Shift aktif' : 'Shift belum dibuka'}
          </strong>
          {shiftOpen && activeShift ? (
            <span style={{ color: '#475569' }}>
              · Dibuka {formatShiftTime(activeShift.openedAt)}
              {activeShift.openingCash != null ? ` · Kas awal ${activeShift.openingCash.toLocaleString('id-ID')}` : ''}
            </span>
          ) : (
            <span style={{ color: '#92400e' }}>Buka shift sebelum transaksi kasir</span>
          )}
        </div>
        {!shiftOpen ? (
          <Link
            href={selectedOutletId ? `/shift/open?outletId=${encodeURIComponent(selectedOutletId)}` : '/shift/open'}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              background: '#16a34a',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.8125rem',
            }}
          >
            Buka Shift →
          </Link>
        ) : null}
      </div>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.65rem 1rem',
          borderBottom: `1px solid ${colors.light.border.default}`,
          background: colors.light.bg.base,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.95rem' }}>Kasir</strong>
          <span style={{ color: colors.light.text.secondary, fontSize: '0.875rem' }}>{userName}</span>
          {selectedOutletLabel && !showOutletPicker ? (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: colors.primary[700],
                background: colors.primary[50],
                border: `1px solid ${colors.primary[600]}`,
                borderRadius: 999,
                padding: '0.15rem 0.55rem',
              }}
            >
              {selectedOutletLabel}
            </span>
          ) : null}
        </div>

        <nav aria-label="Navigasi kasir" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {showOutletPicker ? (
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
              <span style={{ color: colors.light.text.secondary, fontWeight: 600 }}>Cabang</span>
              <select
                value={selectedOutletId ?? ''}
                onChange={(event) => onOutletChange?.(event.target.value)}
                style={{
                  minHeight: 40,
                  borderRadius: 8,
                  border: `1px solid ${colors.light.border.default}`,
                  padding: '0 0.5rem',
                  fontSize: '0.8125rem',
                  maxWidth: 220,
                }}
                aria-label="Pilih cabang aktif kasir"
              >
                <option value="" disabled>
                  Pilih cabang…
                </option>
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <Link href="/pos" style={navLinkStyle(pathname === '/pos')}>
            Kasir
          </Link>
          <Link href="/pos/online-orders" style={navLinkStyle(pathname.startsWith('/pos/online-orders'))}>
            Order Online
            {onlineOrderCount && onlineOrderCount > 0 ? (
              <span
                style={{
                  marginLeft: 6,
                  background: colors.primary[600],
                  color: '#fff',
                  borderRadius: 999,
                  padding: '0 6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {onlineOrderCount}
              </span>
            ) : null}
          </Link>
          <Link href="/shift/close" style={navLinkStyle(pathname.startsWith('/shift/close'))}>
            Tutup Shift
          </Link>
          <Button type="button" variant="ghost" onClick={onLogout} style={{ minHeight: 40 }}>
            Keluar
          </Button>
        </nav>
      </header>
    </>
  );
}
