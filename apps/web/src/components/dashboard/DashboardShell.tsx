'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { APP_NAME } from '@barokah/shared';
import { Button } from '@barokah/ui';
import type { AuthUser } from '@/lib/auth';
import { tokenStorage } from '@/lib/auth';
import { useOnlineOrderBadge } from '@/hooks/useOnlineOrderBadge';
import { useDeliveryBadge } from '@/hooks/useDeliveryBadge';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchFinanceSummary } from '@/lib/finance-api';

const SIDEBAR_WIDTH = 260;

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  badgeKey?: 'onlineOrders' | 'deliveries';
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Beranda',
    items: [
      { href: '/dashboard', label: 'Ringkasan', exact: true },
      { href: '/dashboard/analytics', label: 'Analitik' },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { href: '/pos', label: 'Kasir' },
      { href: '/shift/open', label: 'Buka Shift' },
      { href: '/shift/close', label: 'Tutup Shift' },
      { href: '/dashboard/transactions', label: 'Void & Struk' },
      { href: '/dashboard/deliveries', label: 'Pengiriman', badgeKey: 'deliveries' },
      { href: '/dashboard/online-orders', label: 'Pesanan Web' },
      { href: '/pos/online-orders', label: 'Order Online (Kasir)', badgeKey: 'onlineOrders' },
    ],
  },
  {
    title: 'Inventori & Pembelian',
    items: [
      { href: '/dashboard/inventory', label: 'Stok' },
      { href: '/dashboard/purchase-orders', label: 'Order Distributor' },
    ],
  },
  {
    title: 'Keuangan',
    items: [{ href: '/dashboard/finance', label: 'Keuangan', exact: true }],
  },
  {
    title: 'Katalog',
    items: [
      { href: '/master/products', label: 'Produk' },
      { href: '/master/bundles', label: 'Paket Bundling' },
      { href: '/master/categories', label: 'Kategori' },
      { href: '/dashboard/promotions', label: 'Promo & Diskon' },
      { href: '/dashboard/units', label: 'Satuan' },
    ],
  },
  {
    title: 'Pelanggan',
    items: [{ href: '/dashboard/customers', label: 'Member & Pelanggan' }],
  },
  {
    title: 'Organisasi',
    items: [
      { href: '/dashboard/settings', label: 'Pengaturan' },
      { href: '/dashboard/users', label: 'Pengguna & Peran' },
      { href: '/dashboard/outlets', label: 'Cabang' },
      { href: '/dashboard/store', label: 'Profil Toko' },
    ],
  },
];

const ICONS: Record<string, string> = {
  Ringkasan: '◫',
  Analitik: '◧',
  Kasir: '▣',
  'Order Online (Kasir)': '◎',
  'Pesanan Web': '◈',
  Pengiriman: '➚',
  'Buka Shift': '◷',
  'Tutup Shift': '◴',
  'Void & Struk': '↩',
  Stok: '▤',
  Keuangan: '◫',
  'Order Distributor': '⇄',
  Produk: '▦',
  'Paket Bundling': '▣',
  'Promo & Diskon': '％',
  Kategori: '▥',
  Satuan: '⎔',
  'Member & Pelanggan': '★',
  Pengaturan: '⚙',
  'Pengguna & Peran': '◉',
  'Profil Toko': '⌂',
  Cabang: '⌂',
};

const shellStyle = (bg: string) =>
  ({
    minHeight: '100vh',
    display: 'flex',
    background: bg,
  }) as const;

const sidebarStyle = (mobileOpen: boolean): React.CSSProperties => ({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  background: '#0f172a',
  color: '#f8fafc',
  display: 'flex',
  flexDirection: 'column',
  padding: '1.25rem 0',
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  zIndex: 40,
  transform: mobileOpen ? 'translateX(0)' : undefined,
  transition: 'transform 0.2s ease',
});

const mainStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  marginLeft: SIDEBAR_WIDTH,
} as const;

const headerStyle = (tokens: ReturnType<typeof useAdminTheme>['tokens']): React.CSSProperties => ({
  background: tokens.headerBg,
  borderBottom: `1px solid ${tokens.headerBorder}`,
  padding: '1rem 1.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  position: 'sticky',
  top: 0,
  zIndex: 20,
});

const contentStyle = {
  flex: 1,
  padding: '1.5rem',
  overflow: 'auto',
} as const;

function roleLabel(role: string): string {
  if (role === 'OWNER') return 'Pemilik';
  if (role === 'MANAGER') return 'Manajer';
  if (role === 'CASHIER') return 'Kasir';
  return role;
}

function pageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Ringkasan';
  if (pathname.startsWith('/dashboard/analytics')) return 'Analitik';
  if (pathname.startsWith('/dashboard/admin')) return 'Pusat Admin';
  if (pathname.startsWith('/dashboard/integrations')) return 'Integrasi & API';
  if (pathname.startsWith('/dashboard/promotions')) return 'Promo & Diskon';
  if (pathname.startsWith('/dashboard/customers')) return 'Member & Pelanggan';
  if (pathname.startsWith('/dashboard/inventory') || pathname.startsWith('/dashboard/stock')) return 'Manajemen Stok';
  if (pathname.startsWith('/dashboard/outlets')) return 'Manajemen Cabang';
  if (pathname.startsWith('/dashboard/store')) return 'Profil Toko';
  if (pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/roles')) return 'Pengguna & Peran';
  if (
    pathname.startsWith('/dashboard/finance') ||
    pathname.startsWith('/dashboard/receivables') ||
    pathname.startsWith('/dashboard/payables') ||
    pathname.startsWith('/dashboard/deposits') ||
    pathname.startsWith('/dashboard/expenses')
  ) {
    return 'Keuangan';
  }
  if (pathname.startsWith('/dashboard/purchase-orders')) return 'Order Distributor';
  if (pathname.startsWith('/dashboard/transactions')) return 'Void & Struk';
  if (pathname.startsWith('/dashboard/settings')) return 'Pengaturan';
  if (pathname.startsWith('/master/products')) return 'Produk';
  if (pathname.startsWith('/master/bundles')) return 'Paket Bundling';
  if (pathname.startsWith('/master/categories')) return 'Kategori';
  if (pathname.startsWith('/dashboard/units') || pathname.startsWith('/master/units')) return 'Satuan';
  if (pathname.startsWith('/dashboard/online-orders')) return 'Pesanan Web';
  if (pathname.startsWith('/dashboard/deliveries')) return 'Antrian Pengiriman';
  if (pathname.startsWith('/pos/online-orders')) return 'Order Online';
  if (pathname.startsWith('/shift/open')) return 'Buka Shift';
  if (pathname.startsWith('/shift/close')) return 'Tutup Shift';
  if (pathname.startsWith('/pos')) return 'Kasir';
  return 'Admin';
}

export function DashboardShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { outlets, selectedOutletId, needsOutletPick, setSelectedOutletId } = useOutletSelection();
  const { theme, tokens, toggleTheme, isDark } = useAdminTheme();
  const showOutletPicker = outlets.length > 1;
  const onlineOrderCount = useOnlineOrderBadge(true, { outletId: selectedOutletId });
  const deliveryCount = useDeliveryBadge(true, selectedOutletId);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [overdueReceivableCount, setOverdueReceivableCount] = useState(0);
  const showFinanceBadge =
    (user.role === 'OWNER' || user.role === 'MANAGER' || user.role === 'ACCOUNTANT') &&
    overdueReceivableCount > 0;

  useEffect(() => {
    if (user.role !== 'OWNER' && user.role !== 'MANAGER' && user.role !== 'ACCOUNTANT') {
      return;
    }
    if (needsOutletPick) {
      setOverdueReceivableCount(0);
      return;
    }
    void fetchFinanceSummary({ outletId: selectedOutletId ?? undefined })
      .then((summary) => setOverdueReceivableCount(summary.receivablesOverdue))
      .catch(() => setOverdueReceivableCount(0));
  }, [user.role, selectedOutletId, needsOutletPick, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  function handleLogout() {
    tokenStorage.clear();
    router.replace('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (href === '/dashboard/finance') {
      return (
        pathname === href ||
        pathname.startsWith('/dashboard/receivables') ||
        pathname.startsWith('/dashboard/payables') ||
        pathname.startsWith('/dashboard/deposits') ||
        pathname.startsWith('/dashboard/expenses')
      );
    }
    if (href === '/dashboard/users') {
      return pathname === href || pathname.startsWith('/dashboard/roles');
    }
    if (href === '/dashboard/settings') {
      return pathname === href || pathname.startsWith('/dashboard/integrations');
    }
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const title = pageTitle(pathname);

  function renderBadge(item: NavItem) {
    if (item.badgeKey === 'onlineOrders' && onlineOrderCount > 0) {
      return (
        <span
          style={{
            marginLeft: 'auto',
            background: '#16a34a',
            color: '#fff',
            borderRadius: '999px',
            padding: '0.1rem 0.45rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {onlineOrderCount > 99 ? '99+' : onlineOrderCount}
        </span>
      );
    }
    if (item.badgeKey === 'deliveries' && deliveryCount > 0) {
      return (
        <span
          style={{
            marginLeft: 'auto',
            background: '#2563eb',
            color: '#fff',
            borderRadius: '999px',
            padding: '0.1rem 0.45rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {deliveryCount > 99 ? '99+' : deliveryCount}
        </span>
      );
    }
    return null;
  }

  const sidebarContent = (
    <>
      <div style={{ padding: '0 1.25rem 1.25rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Admin</div>
        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#22c55e' }}>{APP_NAME}</div>
      </div>
      <nav aria-label="Menu utama" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div
              style={{
                padding: '0 1.25rem 0.35rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              {group.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      padding: '0.625rem 1.25rem',
                      textDecoration: 'none',
                      fontSize: '0.9375rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? '#ffffff' : '#cbd5e1',
                      background: active ? '#16a34a' : 'transparent',
                      borderLeft: active ? '3px solid #4ade80' : '3px solid transparent',
                      transition: 'background 0.12s ease, color 0.12s ease',
                    }}
                    onFocus={(e) => {
                      if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    }}
                    onBlur={(e) => {
                      if (!active) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span aria-hidden style={{ width: '1.125rem', textAlign: 'center', opacity: active ? 1 : 0.75 }}>
                      {ICONS[item.label] ?? '•'}
                    </span>
                    <span>{item.label}</span>
                    {renderBadge(item)}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div style={shellStyle(tokens.shellBg)} data-admin-theme={theme}>
      <style>{`
        html[data-admin-theme="dark"] {
          --admin-bar-track: #334155;
          color-scheme: dark;
        }
        html[data-admin-theme="light"] {
          --admin-bar-track: #e2e8f0;
        }
        @media (max-width: 900px) {
          .dashboard-main { margin-left: 0 !important; }
          .dashboard-sidebar {
            transform: translateX(-100%);
          }
          .dashboard-sidebar.open {
            transform: translateX(0);
            box-shadow: 4px 0 24px rgba(0,0,0,0.25);
          }
          .dashboard-overlay {
            display: block !important;
          }
        }
      `}</style>

      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          className="dashboard-overlay"
          onClick={() => setMobileNavOpen(false)}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.5)',
            border: 'none',
            zIndex: 30,
            cursor: 'pointer',
          }}
        />
      ) : null}

      <aside
        className={`dashboard-sidebar${mobileNavOpen ? ' open' : ''}`}
        style={sidebarStyle(mobileNavOpen)}
        aria-label="Navigasi dashboard"
      >
        {sidebarContent}
      </aside>

      <div className="dashboard-main" style={mainStyle}>
        <header style={headerStyle(tokens)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <button
              type="button"
              aria-label="Buka menu navigasi"
              onClick={() => setMobileNavOpen(true)}
              style={{
                display: 'none',
                padding: '0.4rem 0.6rem',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '1.125rem',
              }}
              className="mobile-menu-btn"
            >
              ☰
            </button>
            <style>{`@media (max-width: 900px) { .mobile-menu-btn { display: block !important; } }`}</style>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', color: tokens.text, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {title}
                {showFinanceBadge ? (
                  <Link
                    href="/dashboard/finance?tab=piutang&status=OVERDUE"
                    title={`${overdueReceivableCount} piutang jatuh tempo`}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      borderRadius: '999px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    {overdueReceivableCount > 99 ? '99+' : overdueReceivableCount} overdue
                  </Link>
                ) : null}
              </h1>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: tokens.muted }}>
                {user.tenantName} · {roleLabel(user.role)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
              title={isDark ? 'Mode terang' : 'Mode gelap'}
              style={{
                padding: '0.4rem 0.65rem',
                borderRadius: 8,
                border: `1px solid ${tokens.headerBorder}`,
                background: tokens.headerBg,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              {isDark ? '☀' : '☾'}
            </button>
            {showOutletPicker && (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  fontSize: '0.8125rem',
                  color: tokens.muted,
                }}
              >
                <span>Outlet</span>
                <select
                  value={selectedOutletId ?? ''}
                  onChange={(e) => setSelectedOutletId(e.target.value)}
                  aria-label="Pilih outlet"
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    border: needsOutletPick ? '1px solid #f59e0b' : `1px solid ${tokens.headerBorder}`,
                    fontSize: '0.875rem',
                    minWidth: '160px',
                    background: tokens.headerBg,
                    color: tokens.text,
                  }}
                >
                  <option value="" disabled>
                    Pilih cabang…
                  </option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span style={{ fontSize: '0.875rem', color: tokens.text }}>{user.fullName}</span>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </header>
        <div style={contentStyle}>{children}</div>
      </div>
    </div>
  );
}
