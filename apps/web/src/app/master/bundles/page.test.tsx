import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BundlesPage from './page';

const fetchBundlesMock = vi.fn();
const createBundleMock = vi.fn();
const fetchMeMock = vi.fn();
const authFetchMock = vi.fn();

vi.mock('@/lib/bundles-api', () => ({
  fetchBundles: (...args: unknown[]) => fetchBundlesMock(...args),
  createBundle: (...args: unknown[]) => createBundleMock(...args),
  updateBundle: vi.fn(),
  deleteBundle: vi.fn(),
  upsertBundleOutletPolicy: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  useOutletSelection: () => ({ selectedOutletId: 'outlet-1', needsOutletPick: false }),
}));

describe('BundlesPage', () => {
  beforeEach(() => {
    fetchBundlesMock.mockReset();
    createBundleMock.mockReset();
    fetchMeMock.mockReset();
    authFetchMock.mockReset();
    fetchMeMock.mockResolvedValue({
      id: 'mgr-1',
      role: 'MANAGER',
      fullName: 'Manager',
      tenantId: 'tenant-1',
      tenantName: 'Barokah',
      outletIds: ['outlet-1'],
    });
    fetchBundlesMock.mockResolvedValue([]);
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          items: [
            { id: 'prod-1', sku: 'SKU-1', name: 'Semen', hasVariants: false },
            { id: 'prod-2', sku: 'SKU-2', name: 'Pipa', hasVariants: false },
          ],
        },
      }),
    });
  });

  it('renders create bundle button for manager', async () => {
    render(<BundlesPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Buat bundle' })).toBeInTheDocument();
    });
  });

  it('opens create modal when clicking create button', async () => {
    render(<BundlesPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Buat bundle' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Buat bundle' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Buat bundle baru')).toBeInTheDocument();
  });
});
