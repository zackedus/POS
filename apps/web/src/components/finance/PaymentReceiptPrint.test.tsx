import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PaymentReceiptView } from '@barokah/shared';
import { PaymentReceiptPrint } from './PaymentReceiptPrint';

const receipt: PaymentReceiptView = {
  receiptNumber: 'BKT-PAY-20260609-003',
  kind: 'PAYABLE_PAYMENT',
  amount: 2_500_000,
  method: 'TRANSFER',
  createdAt: '2026-06-09T12:00:00.000Z',
  recordedByName: 'Manager',
  counterpartyName: 'Supplier ABC',
  storeName: 'Toko Barokah',
  transferReference: 'TRF-001',
  bankName: 'BCA',
  outstandingBefore: 5_000_000,
  outstandingAfter: 2_500_000,
};

describe('PaymentReceiptPrint', () => {
  it('renders receipt number and title', () => {
    const html = renderToStaticMarkup(<PaymentReceiptPrint receipt={receipt} />);
    expect(html).toMatch(/BKT-PAY-20260609-003/);
    expect(html).toMatch(/Bukti Pembayaran Utang/);
    expect(html).toMatch(/Supplier ABC/);
    expect(html).toMatch(/data-testid="payment-receipt-print"/);
  });
});
