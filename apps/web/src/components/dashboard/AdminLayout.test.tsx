import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout';

const { replaceMock, clearMock, fetchMeMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  clearMock: vi.fn(),
  fetchMeMock: vi.fn(
    () =>
      new Promise(() => {
        /* keep loading state for assertion */
      }),
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/lib/auth', () => ({
  tokenStorage: {
    getAccessToken: vi.fn(() => 'token'),
    getRole: vi.fn(() => 'OWNER'),
    clear: clearMock,
  },
  hasClientAuthSession: vi.fn(() => true),
  readClientRoleFromCookie: vi.fn(() => 'OWNER'),
  fetchMe: () => fetchMeMock(),
}));

vi.mock('@/lib/reports', () => ({
  fetchOutlets: vi.fn(() =>
    Promise.resolve({
      outlets: [{ id: 'out-1', name: 'Cabang 1', code: 'C1' }],
      requiresOutletSelection: false,
      defaultOutletId: 'out-1',
    }),
  ),
}));

vi.mock('@/lib/outlet-selection-state', () => ({
  initOutletSelection: vi.fn(),
}));

vi.mock('@/lib/rbac', () => ({
  canAccessDashboard: vi.fn(() => true),
}));

vi.mock('./DashboardShell', () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

describe('AdminLayout', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    clearMock.mockReset();
    fetchMeMock.mockReset();
    fetchMeMock.mockImplementation(
      () =>
        new Promise(() => {
          /* keep loading state for assertion */
        }),
    );
  });

  it('renders loading state after client mount with div status text, not paragraph wrapping skeleton', async () => {
    const { container } = render(
      <AdminLayout>
        <div>Child</div>
      </AdminLayout>,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Memuat halaman admin…');
    });

    expect(container.querySelector('p')).toBeNull();
    expect(screen.getByLabelText('Memuat data')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-shell')).not.toBeInTheDocument();
  });

  it('redirects to login when profile fetch fails after refresh', async () => {
    fetchMeMock.mockRejectedValue(new Error('Sesi telah berakhir.'));

    render(
      <AdminLayout>
        <div>Child</div>
      </AdminLayout>,
    );

    await waitFor(() => {
      expect(clearMock).toHaveBeenCalled();
      expect(replaceMock).toHaveBeenCalledWith('/login');
    });
  });
});
