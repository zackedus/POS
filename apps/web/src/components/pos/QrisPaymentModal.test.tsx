import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QrisPaymentModal } from './QrisPaymentModal';

const pollQrisStatusMock = vi.fn();
const confirmQrisMockPaymentMock = vi.fn();

vi.mock('@/lib/qris-payment', () => ({
  pollQrisStatus: (...args: unknown[]) => pollQrisStatusMock(...args),
  confirmQrisMockPayment: (...args: unknown[]) => confirmQrisMockPaymentMock(...args),
}));

describe('QrisPaymentModal', () => {
  beforeEach(() => {
    pollQrisStatusMock.mockReset();
    confirmQrisMockPaymentMock.mockReset();
  });

  it('polls immediately and completes when status becomes PAID', async () => {
    pollQrisStatusMock.mockResolvedValue({
      paymentId: 'QRIS-TEST',
      status: 'PAID',
      amount: 332500,
      qrPayload: 'ID.QRIS.MOCK|QRIS-TEST|332500|BAROKAH-CORE-POS',
      transactionId: 'txn-qris-1',
      receiptNo: 'TRX-QRIS-1',
      total: 332500,
      expiresAt: new Date().toISOString(),
    });

    const onPaid = vi.fn();

    render(
      <QrisPaymentModal
        session={{
          paymentId: 'QRIS-TEST',
          status: 'PENDING',
          amount: 332500,
          qrPayload: 'ID.QRIS.MOCK|QRIS-TEST|332500|BAROKAH-CORE-POS',
          mockAutoConfirmMs: 3000,
          expiresAt: new Date().toISOString(),
        }}
        onClose={vi.fn()}
        onPaid={onPaid}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Pembayaran QRIS' })).toBeInTheDocument();
    expect(pollQrisStatusMock).toHaveBeenCalledWith('QRIS-TEST');

    await waitFor(() => {
      expect(onPaid).toHaveBeenCalledWith({
        transactionId: 'txn-qris-1',
        receiptNo: 'TRX-QRIS-1',
        total: 332500,
      });
    });
  });
});
