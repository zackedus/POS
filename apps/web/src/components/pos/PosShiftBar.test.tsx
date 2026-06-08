import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PosShiftBar } from './PosShiftBar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/pos',
}));

describe('PosShiftBar', () => {
  it('renders three POS channel tabs in Bahasa Indonesia', () => {
    render(
      <PosShiftBar
        userName="Kasir Demo"
        activeShift={{ id: 's1', openedAt: '2026-06-09T08:00:00.000Z', openingCash: 100000, outletId: 'o1' }}
        onlineOrderCount={2}
        marketplaceOrderCount={1}
        onLogout={() => undefined}
      />,
    );

    expect(screen.getByRole('link', { name: /Toko/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Order Web/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Marketplace/i })).toBeTruthy();
    expect(screen.getByText('Penjualan Toko')).toBeTruthy();
  });
});
