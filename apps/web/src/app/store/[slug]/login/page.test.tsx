import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StoreLoginPage from './page';

const pushMock = vi.fn();
const setSessionMock = vi.fn();

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'toko-a' }),
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/store/store-api', () => ({
  loginStoreCustomer: vi.fn(),
}));

vi.mock('@/lib/store/store-customer-auth-context', () => ({
  useStoreCustomerAuth: () => ({ setSession: setSessionMock }),
}));

describe('StoreLoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    setSessionMock.mockReset();
  });

  it('redirects to account page after successful login', async () => {
    const { loginStoreCustomer } = await import('@/lib/store/store-api');
    vi.mocked(loginStoreCustomer).mockResolvedValue({
      customer: {
        id: 'cust-1',
        name: 'Budi',
        phone: '081234567890',
        email: null,
        memberCode: 'MBR-TEST01',
        points: 0,
        memberSince: '2026-06-01T00:00:00.000Z',
        addressCount: 1,
      },
      tokens: { accessToken: 'access', refreshToken: 'refresh', expiresIn: '7d' },
    });

    render(<StoreLoginPage />);
    fireEvent.change(screen.getByPlaceholderText('08xxxxxxxxxx'), { target: { value: '081234567890' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Masuk' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/store/toko-a/account');
    });
    expect(setSessionMock).toHaveBeenCalled();
  });
});
