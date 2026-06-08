import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/pos/online-orders',
}));

vi.mock('@/lib/auth', () => ({
  fetchMe: vi.fn().mockResolvedValue({ fullName: 'Kasir Demo', outletIds: ['o1'] }),
  tokenStorage: { clear: vi.fn() },
}));

vi.mock('@/lib/shifts-api', () => ({
  fetchActiveShift: vi.fn().mockResolvedValue({ id: 's1', openedAt: '2026-06-09T08:00:00.000Z', outletId: 'o1' }),
}));

vi.mock('@/hooks/useOnlineOrderBadge', () => ({
  ONLINE_ORDERS_POLL_MS: 15_000,
  useOnlineOrderBadge: () => 0,
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({
    outlets: [{ id: 'o1', label: 'Cabang Utama' }],
    selectedOutletId: 'o1',
    needsOutletPick: false,
    setSelectedOutletId: vi.fn(),
  }),
}));

vi.mock('@/lib/online-orders-api', () => ({
  fetchFulfillmentQueue: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/pos/PosFulfillmentQueue', () => ({
  PosFulfillmentQueue: () => <div role="status">Antrian order web mock</div>,
}));

describe('OnlineOrdersFulfillmentPage', () => {
  it('shows Order Web heading and fulfillment queue', async () => {
    const { default: OnlineOrdersFulfillmentPage } = await import('@/app/pos/online-orders/page');
    render(<OnlineOrdersFulfillmentPage />);
    expect(await screen.findByRole('heading', { name: 'Order Web' })).toBeTruthy();
    expect(await screen.findByText('Antrian order web mock')).toBeTruthy();
  });
});
