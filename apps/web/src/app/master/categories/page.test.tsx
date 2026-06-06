import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CategoriesPage from './page';

const authFetchMock = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
  };
});

vi.mock('@/lib/auth', () => ({
  authFetch: (...args: unknown[]) => authFetchMock(...args),
}));

describe('CategoriesPage', () => {
  beforeEach(() => {
    authFetchMock.mockReset();
  });

  it('shows loading and rendered categories', async () => {
    authFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 'cat-1', name: 'Semen' }],
      }),
    });

    render(<CategoriesPage />);

    expect(screen.getByText('Memuat kategori dari server...')).toBeInTheDocument();
    expect(await screen.findByText('Semen')).toBeInTheDocument();
  });

  it('shows error state when load fails', async () => {
    authFetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Gagal memuat data kategori.' },
      }),
    });

    render(<CategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Gagal memproses data kategori.')).toBeInTheDocument();
    });
    expect(screen.getByText('Gagal memuat data kategori.')).toBeInTheDocument();
  });

  it('creates category and shows success message', async () => {
    authFetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'cat-2', name: 'Batu Bata' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [{ id: 'cat-2', name: 'Batu Bata' }] }),
      });

    render(<CategoriesPage />);

    fireEvent.change(screen.getByLabelText('Nama kategori'), { target: { value: 'Batu Bata' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah' }));

    await waitFor(() => {
      expect(screen.getByText('Kategori baru berhasil ditambahkan.')).toBeInTheDocument();
    });
    expect(screen.getByText('Batu Bata')).toBeInTheDocument();
  });
});
