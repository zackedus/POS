import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const pushMock = vi.fn();
const replaceMock = vi.fn();
const loginRequestMock = vi.fn();
const setTokensMock = vi.fn();
const getAccessTokenMock = vi.fn(() => null);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock('@/lib/auth', () => ({
  loginRequest: (...args: unknown[]) => loginRequestMock(...args),
  fetchMe: vi.fn(),
  syncAuthSessionFromStorage: vi.fn(),
  persistUserRole: vi.fn(),
  tokenStorage: {
    getAccessToken: () => getAccessTokenMock(),
    setTokens: (...args: unknown[]) => setTokensMock(...args),
    clear: vi.fn(),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    replaceMock.mockReset();
    loginRequestMock.mockReset();
    setTokensMock.mockReset();
    getAccessTokenMock.mockReturnValue(null);
  });

  it('redirects owner to dashboard after login', async () => {
    loginRequestMock.mockResolvedValue({
      user: { role: 'OWNER', id: 'u1', email: 'owner@barokah.local', fullName: 'Owner', tenantId: 't1', tenantName: 'Toko', outletIds: [] },
      tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: '15m' },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email kasir/i), { target: { value: 'owner@barokah.local' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Owner123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dashboard');
    });
    expect(setTokensMock).toHaveBeenCalledWith('a', 'r', 'OWNER');
  });

  it('redirects cashier to pos after login', async () => {
    loginRequestMock.mockResolvedValue({
      user: { role: 'CASHIER', id: 'u2', email: 'kasir@barokah.local', fullName: 'Kasir', tenantId: 't1', tenantName: 'Toko', outletIds: [] },
      tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: '15m' },
    });

    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText(/Email kasir/i), { target: { value: 'kasir@barokah.local' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Kasir123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/pos');
    });
  });
});
