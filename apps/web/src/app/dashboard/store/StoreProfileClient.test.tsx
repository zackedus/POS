import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoreProfileClient from './StoreProfileClient';

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

vi.mock('@/lib/settings-api', () => ({
  fetchTenantProfile: vi.fn().mockResolvedValue({
    id: 't1',
    name: 'Barokah Toko Bangunan',
    slug: 'barokah-bangunan',
    contactPhone: null,
    whatsapp: null,
    description: null,
    logoUrl: null,
    isActive: true,
    updatedAt: '2026-06-09T00:00:00Z',
  }),
  fetchStorefrontSettings: vi.fn().mockResolvedValue({
    storefrontUrl: '/store/barokah-bangunan',
    settings: {
      enabled: true,
      appearance: {
        heroTitle: 'Barokah Toko Bangunan',
        heroSubtitle: 'Sub',
        heroImageUrl: null,
        accentColor: '#2563eb',
        tagline: 'Tag',
        footerText: 'Footer',
        promoBannerText: null,
      },
      catalog: { featuredCategoryIds: [], defaultSort: 'name_asc', showOutOfStock: true },
      branches: { enabledOutletIds: [], pickupEnabled: true, deliveryEnabled: true, deliveryRadiusKm: null, deliveryNotes: '' },
      checkout: {
        minOrderAmount: 0,
        paymentInstructions: 'Instruksi checkout',
        requireName: true,
        requirePhone: true,
        requireAddress: true,
        requireCustomerLogin: true,
      },
      payment: { manualTransferEnabled: false, onlinePaymentEnabled: true, codEnabled: true },
      seo: { metaTitle: 'Toko', metaDescription: 'Desc' },
      operations: {
        onlineOrderHoursStart: '00:00',
        onlineOrderHoursEnd: '23:59',
        closedMessage: 'Tutup',
        temporarilyClosed: false,
      },
    },
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
  updateTenantProfile: vi.fn(),
  updateStorefrontSettings: vi.fn().mockResolvedValue({
    storefrontUrl: '/store/barokah-bangunan',
    settings: {
      enabled: true,
      appearance: {
        heroTitle: 'Barokah Toko Bangunan',
        heroSubtitle: 'Sub',
        heroImageUrl: null,
        accentColor: '#2563eb',
        tagline: 'Tag',
        footerText: 'Footer',
        promoBannerText: null,
      },
      catalog: { featuredCategoryIds: [], defaultSort: 'name_asc', showOutOfStock: true },
      branches: { enabledOutletIds: [], pickupEnabled: true, deliveryEnabled: true, deliveryRadiusKm: null, deliveryNotes: '' },
      checkout: {
        minOrderAmount: 0,
        paymentInstructions: 'Instruksi checkout',
        requireName: true,
        requirePhone: true,
        requireAddress: true,
        requireCustomerLogin: true,
      },
      payment: { manualTransferEnabled: false, onlinePaymentEnabled: false, codEnabled: true },
      seo: { metaTitle: 'Toko', metaDescription: 'Desc' },
      operations: {
        onlineOrderHoursStart: '00:00',
        onlineOrderHoursEnd: '23:59',
        closedMessage: 'Tutup',
        temporarilyClosed: false,
      },
    },
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
  testMidtransConnection: vi.fn().mockResolvedValue({ ok: true, mode: 'mock', statusCode: 200, message: 'OK' }),
  midtransModeLabel: (mode: string) => mode,
  midtransStatusLabel: () => ({ label: 'Belum dikonfigurasi', variant: 'warning' as const }),
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <StoreProfileClient />
    </QueryClientProvider>,
  );
}

describe('StoreProfileClient payment tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment settings sections', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Pembayaran' }));
    expect(await screen.findByText('Integrasi Midtrans')).toBeInTheDocument();
    expect(screen.getByText('Metode pembayaran webstore')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uji Koneksi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan pengaturan pembayaran' })).toBeInTheDocument();
  });
});
