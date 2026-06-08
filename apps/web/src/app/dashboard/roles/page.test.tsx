import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesPanel } from '@/components/dashboard/users/RolesPanel';

const fetchMeMock = vi.fn();
const fetchRolesMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

vi.mock('@/lib/roles-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/roles-api')>();
  return {
    ...actual,
    fetchRoles: (...args: unknown[]) => fetchRolesMock(...args),
  };
});

describe('RolesPanel', () => {
  beforeEach(() => {
    fetchMeMock.mockResolvedValue({
      id: 'owner-1',
      role: 'OWNER',
      fullName: 'Owner Demo',
    });
    fetchRolesMock.mockResolvedValue({
      roles: [
        { id: 'OWNER', label: 'Pemilik', description: 'Akses penuh tenant' },
        { id: 'CASHIER', label: 'Kasir', description: 'Kasir toko' },
      ],
      matrix: {
        permissions: [{ key: 'pos_transactions', label: 'POS transaksi' }],
        roles: [
          {
            id: 'OWNER',
            label: 'Pemilik',
            description: 'Akses penuh',
            permissions: { pos_transactions: 'full' },
          },
        ],
        levelLabels: { full: 'Penuh', read: 'Baca saja', partial: 'Terbatas', none: 'Tidak' },
        partialNotes: {},
        customRolesPhase: 3,
      },
    });
  });

  it('renders role list and permission matrix for owner', async () => {
    render(<RolesPanel />);
    expect(await screen.findByText('Daftar Role Sistem')).toBeInTheDocument();
    expect(screen.getByText('Matriks Izin (Permission Matrix)')).toBeInTheDocument();
    expect(screen.getByText('Coming soon — Fase 3')).toBeInTheDocument();
  });
});
