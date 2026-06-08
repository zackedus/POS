import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardShell } from './DashboardShell';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/master/products',
  useRouter: () => ({ replace: pushMock }),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [
      { id: 'out-a', label: 'Cabang 1' },
      { id: 'out-b', label: 'Cabang 2' },
    ],
    selectedOutletId: 'out-a',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/hooks/useOnlineOrderBadge', () => ({
  ONLINE_ORDERS_POLL_MS: 15_000,
  useOnlineOrderBadge: () => 0,
}));

vi.mock('@/hooks/useAdminTheme', () => ({
  useAdminTheme: () => ({
    theme: 'light',
    tokens: {
      shellBg: '#f1f5f9',
      headerBg: '#ffffff',
      headerBorder: '#e2e8f0',
      text: '#0f172a',
      muted: '#64748b',
      cardBg: '#ffffff',
      cardBorder: '#e2e8f0',
    },
    toggleTheme: vi.fn(),
    isDark: false,
  }),
}));

const user = {
  id: 'u1',
  email: 'owner@barokah.local',
  fullName: 'Owner Demo',
  role: 'OWNER',
  tenantId: 't1',
  tenantName: 'Barokah Toko Bangunan',
  outletIds: ['out-a', 'out-b'],
};

describe('DashboardShell', () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it('renders sidebar nav and dynamic page title for master products', () => {
    render(
      <DashboardShell user={user}>
        <p>Konten halaman</p>
      </DashboardShell>,
    );

    expect(screen.getByRole('complementary', { name: 'Navigasi dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menu utama' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Produk' })).toHaveAttribute('href', '/master/products');
    expect(screen.getByRole('link', { name: 'Pengaturan' })).toHaveAttribute('href', '/dashboard/settings');
    expect(screen.getByText('Beranda')).toBeInTheDocument();
    expect(screen.getByText('Katalog')).toBeInTheDocument();
    expect(screen.getByText('Organisasi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produk', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Pilih outlet')).toBeInTheDocument();
    expect(screen.getByText('Konten halaman')).toBeInTheDocument();
  });
});
