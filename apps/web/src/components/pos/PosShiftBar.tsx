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

export interface PosShiftBarProps {
  userName: string;
  activeShift: ShiftSummary | null;
  onlineOrderCount?: number;
  onLogout: () => void;
}

function formatShiftTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function PosShiftBar({ userName, activeShift, onlineOrderCount, onLogout }: PosShiftBarProps) {
  const pathname = usePathname();
  const shiftOpen = Boolean(activeShift);

  return (
    <>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            <span style={{ color: '#92400e' }}>
              Buka shift sebelum transaksi kasir
            </span>
          )}
        </div>
        {!shiftOpen ? (
          <Link
            href="/shift/open"
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
        </div>

        <nav aria-label="Navigasi kasir" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/pos" style={navLinkStyle(pathname === '/pos')}>
            Kasir
          </Link>
          <Link href="/pos/online-orders" style={navLinkStyle(pathname.startsWith('/pos/online-orders'))}>
            Order Online
            {onlineOrderCount && onlineOrderCount > 0 ? (
              <span
                style={{
                  marginLeft: '0.35rem',
                  minWidth: 20,
                  height: 20,
                  borderRadius: 999,
                  background: colors.semantic.error,
                  color: '#fff',
                  fontSize: '0.7rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 0.35rem',
                }}
              >
                {onlineOrderCount > 99 ? '99+' : onlineOrderCount}
              </span>
            ) : null}
          </Link>
          <Link href="/shift/open" style={navLinkStyle(pathname.startsWith('/shift/open'))}>
            Buka Shift
          </Link>
          <Link href="/shift/close" style={navLinkStyle(pathname.startsWith('/shift/close'))}>
            Tutup Shift
          </Link>
          <Button type="button" variant="ghost" onClick={onLogout} style={{ minHeight: 44 }}>
            Keluar
          </Button>
        </nav>
      </header>
    </>
  );
}
