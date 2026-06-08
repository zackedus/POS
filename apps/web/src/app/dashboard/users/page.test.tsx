import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage from './page';

const fetchMeMock = vi.fn();
const fetchUsersMock = vi.fn();
const fetchOutletsMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

vi.mock('@/lib/users-api', () => ({
  fetchUsers: (...args: unknown[]) => fetchUsersMock(...args),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  USER_ROLE_LABELS: { OWNER: 'Pemilik', MANAGER: 'Manajer', CASHIER: 'Kasir' },
}));

vi.mock('@/lib/reports', () => ({
  fetchOutlets: (...args: unknown[]) => fetchOutletsMock(...args),
}));

describe('UsersPage', () => {
  beforeEach(() => {
    fetchMeMock.mockResolvedValue({
      id: 'owner-1',
      role: 'OWNER',
      fullName: 'Owner Demo',
    });
    fetchUsersMock.mockResolvedValue([
      {
        id: 'user-1',
        email: 'kasir@barokah.local',
        fullName: 'Kasir Demo',
        role: 'CASHIER',
        isActive: true,
        createdAt: '2026-06-01T00:00:00.000Z',
        outlets: [{ id: 'out-1', name: 'Cabang Utama', code: 'MAIN' }],
      },
    ]);
    fetchOutletsMock.mockResolvedValue({
      outlets: [{ id: 'out-1', name: 'Cabang Utama', code: 'MAIN' }],
    });
  });

  it('renders user list for owner', async () => {
    render(<UsersPage />);
    expect(await screen.findByText('Manajemen Pengguna')).toBeInTheDocument();
    expect(await screen.findByText('Kasir Demo')).toBeInTheDocument();
    expect(screen.getByText('Tambah Pengguna Baru')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ubah' })).toBeInTheDocument();
  });
});
