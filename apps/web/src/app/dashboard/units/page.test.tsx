import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardUnitsPage from './page';

const authFetchMock = vi.fn();
const fetchMeMock = vi.fn();

vi.mock('@/lib/api', () => ({
  apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
}));

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
  fetchMe: () => fetchMeMock(),
}));

describe('DashboardUnitsPage', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    fetchMeMock.mockReset();
    fetchMeMock.mockResolvedValue({
      id: 'u-1',
      role: 'OWNER',
      fullName: 'Owner',
      tenantName: 'Toko',
      outletIds: [],
    });
  });

  it('loads and displays units with usage info', async () => {
    authFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'u-1',
            name: 'Kilogram',
            symbol: 'kg',
            usage: { baseProductCount: 3, conversionEntryCount: 1 },
          },
          {
            id: 'u-2',
            name: 'Dus',
            symbol: 'dus',
            usage: { baseProductCount: 0, conversionEntryCount: 2 },
          },
        ],
      }),
    });

    render(<DashboardUnitsPage />);

    expect(await screen.findByText('Master Satuan')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Kilogram')).toBeInTheDocument();
      expect(screen.getByText('dus')).toBeInTheDocument();
      expect(screen.getByText(/3 satuan dasar/)).toBeInTheDocument();
      expect(screen.getByText(/2 konversi beli\/jual/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Model multi-satuan/)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Master Produk' }).length).toBeGreaterThan(0);
  });

  it('shows error when units request fails', async () => {
    authFetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Gagal memuat data satuan.' },
      }),
    });

    render(<DashboardUnitsPage />);

    expect(await screen.findByText(/Gagal memproses data satuan/)).toBeInTheDocument();
  });
});
