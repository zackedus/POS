import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPageClient } from './SettingsPageClient';

vi.mock('@/lib/auth', () => ({
  fetchMe: vi.fn().mockResolvedValue({
    id: 'u1',
    email: 'owner@barokah.local',
    fullName: 'Owner Demo',
    role: 'OWNER',
    tenantId: 't1',
    tenantName: 'Barokah Toko Bangunan',
    tenantSlug: 'barokah-bangunan',
    outletIds: ['out-a'],
  }),
}));

vi.mock('@/lib/reports', () => ({
  fetchOutlets: vi.fn().mockResolvedValue({
    outlets: [{ id: 'out-a', name: 'Cabang Utama', code: 'MAIN', address: 'Jl. Test', isActive: true }],
  }),
}));

vi.mock('@/lib/promotions-api', () => ({
  fetchPromotions: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/settings-api', () => ({
  fetchTenantSettings: vi.fn().mockResolvedValue({
    ppnEnabled: false,
    ppnRatePercent: 11,
    weeklyReportEmailEnabled: false,
    loyaltyPointsEnabled: true,
    loyaltyEarnRateIdr: 10000,
    loyaltyRedeemEnabled: true,
    loyaltyRedeemValueIdr: 1000,
    loyaltyRedeemMaxPercent: 50,
    midtrans: {
      mode: 'mock',
      isProduction: false,
      serverKeyConfigured: false,
      serverKeyMasked: null,
      clientKeyConfigured: false,
      clientKeyMasked: null,
      keySource: 'none',
      webhookPath: '/api/v1/webhooks/midtrans/online',
      webhookUrl: 'http://localhost:3000/api/v1/webhooks/midtrans/online',
      productionGuardrails: { liveRequiresServerKey: true, webhookStrictInProduction: false, warnings: [] },
    },
  }),
  updateTenantSettings: vi.fn(),
  testMidtransConnection: vi.fn(),
  midtransModeLabel: (mode: string) => mode,
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'out-a', label: 'Cabang Utama' }],
    selectedOutletId: 'out-a',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SettingsPageClient />
    </QueryClientProvider>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings hub with tab navigation', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Pengaturan Aplikasi' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Toko & Tenant' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Loyalty' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pembayaran' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Integrasi & API' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Toko & Tenant' })).toBeInTheDocument();
  });
});
