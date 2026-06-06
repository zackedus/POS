import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OpenShiftPage from './page';

const authFetchMock = vi.fn();
const fetchMeMock = vi.fn();

vi.mock('@/lib/api', () => ({
  apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
  toUserFacingError: (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
}));

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
  fetchMe: (...args: unknown[]) => fetchMeMock(...args),
}));

describe('OpenShiftPage', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    fetchMeMock.mockReset();
    fetchMeMock.mockResolvedValue({
      id: 'manager-1',
      email: 'manager@barokah.local',
      fullName: 'Manager',
      role: 'MANAGER',
      tenantId: 'tenant-1',
      tenantName: 'Barokah',
      outletIds: ['outlet-1'],
    });
  });

  it('shows force-close conflict panel when shift already open', async () => {
    authFetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: { code: 'SHIFT_ALREADY_OPEN', message: 'Shift aktif sudah ada.' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'shift-1',
            openingCash: 200000,
            openedAt: '2026-06-02T07:00:00.000Z',
          },
        }),
      });

    render(<OpenShiftPage />);
    fireEvent.change(screen.getByLabelText('Saldo awal kas (IDR)'), { target: { value: '200000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buka shift' }));

    await waitFor(() => {
      expect(screen.getByText('Konflik shift terdeteksi')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Force-close shift aktif' })).toBeInTheDocument();
  });

  it('opens shift successfully on happy path', async () => {
    authFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'shift-new',
          openingCash: 300000,
          openedAt: '2026-06-02T09:00:00.000Z',
          closedAt: null,
        },
      }),
    });

    render(<OpenShiftPage />);
    fireEvent.change(screen.getByLabelText('Saldo awal kas (IDR)'), { target: { value: '300000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buka shift' }));

    await waitFor(() => {
      expect(screen.getByText('Shift berhasil dibuka')).toBeInTheDocument();
    });
    expect(screen.getByText('ID Shift: shift-new')).toBeInTheDocument();
  });
});
