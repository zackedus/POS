import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CloseShiftPage from './page';

const fetchActiveShiftMock = vi.fn();
const fetchClosePreviewMock = vi.fn();
const closeShiftMock = vi.fn();

vi.mock('@/lib/shifts-api', () => ({
  fetchActiveShift: (...args: unknown[]) => fetchActiveShiftMock(...args),
  fetchClosePreview: (...args: unknown[]) => fetchClosePreviewMock(...args),
  closeShift: (...args: unknown[]) => closeShiftMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('CloseShiftPage', () => {
  beforeEach(() => {
    fetchActiveShiftMock.mockReset();
    fetchClosePreviewMock.mockReset();
    closeShiftMock.mockReset();
    fetchActiveShiftMock.mockResolvedValue({
      id: 'shift-1',
      openingCash: 100000,
      openedAt: '2026-06-06T08:00:00.000Z',
    });
    fetchClosePreviewMock.mockResolvedValue({
      shiftId: 'shift-1',
      openingCash: 100000,
      cashSales: 150000,
      expectedCash: 250000,
      transactionCount: 3,
      openedAt: '2026-06-06T08:00:00.000Z',
    });
  });

  it('shows expected cash preview before submit', async () => {
    render(<CloseShiftPage />);
    await waitFor(() => {
      expect(screen.getByText('Kas diharapkan')).toBeInTheDocument();
    });
    expect(screen.getByText(/250\.000/)).toBeInTheDocument();
    expect(screen.getByText('Penjualan tunai')).toBeInTheDocument();
  });

  it('submits close shift with closing cash', async () => {
    closeShiftMock.mockResolvedValue({
      id: 'shift-1',
      openingCash: 100000,
      expectedCash: 250000,
      closingCash: 250000,
      difference: 0,
    });

    render(<CloseShiftPage />);
    await waitFor(() => {
      expect(screen.getByLabelText('Saldo akhir kas fisik (IDR)')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText('Saldo akhir kas fisik (IDR)'), { target: { value: '250000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup shift' }));

    await waitFor(() => {
      expect(closeShiftMock).toHaveBeenCalledWith('shift-1', 250000);
    });
  });
});
