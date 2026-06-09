import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoreCheckoutPage from './page';

const refreshProfileMock = vi.fn().mockResolvedValue(undefined);

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'toko-a' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/lib/store/store-api', () => ({
  createOrder: vi.fn(),
  fetchStoreCustomerAddresses: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/store/store-customer-auth-context', () => ({
  useStoreCustomerAuth: () => ({
    customer: {
      id: 'cust-1',
      name: 'Budi',
      phone: '6281234567890',
      email: null,
      memberCode: 'MBR-TEST01',
      points: 0,
      memberSince: '2026-06-01T00:00:00.000Z',
      addressCount: 0,
    },
    accessToken: 'access-token',
    isLoggedIn: true,
    loading: false,
    refreshProfile: refreshProfileMock,
  }),
}));

vi.mock('@/lib/store/cart-context', () => ({
  useStoreCart: () => ({
    lines: [{ productId: 'prod-1', name: 'Semen', quantity: 1, price: 65000, unitSymbol: 'sak' }],
    clearCart: vi.fn(),
  }),
}));

vi.mock('@/lib/store/store-config-context', () => ({
  useStoreConfig: () => ({
    config: {
      settings: {
        checkout: { requireCustomerLogin: true, requireName: true, requirePhone: true },
        branches: { pickupEnabled: true, deliveryEnabled: true },
      },
    },
  }),
}));

vi.mock('@/lib/store/use-store-outlet', () => ({
  useStoreOutlet: () => ({
    outlets: [{ id: 'outlet-1', name: 'Cabang Pusat', address: 'Jl. Raya' }],
    outletId: 'outlet-1',
    setOutletId: vi.fn(),
  }),
}));

describe('StoreCheckoutPage', () => {
  beforeEach(() => {
    refreshProfileMock.mockClear();
  });

  it('displays profile phone as 08… when API stores 628…', async () => {
    render(<StoreCheckoutPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/No\. HP/i)).toHaveValue('081234567890');
    });
    expect(refreshProfileMock).toHaveBeenCalled();
  });
});
