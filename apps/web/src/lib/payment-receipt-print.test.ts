import { describe, expect, it } from 'vitest';
import { PAYMENT_RECEIPT_KIND_TITLES, type PaymentReceiptView } from '@barokah/shared';
import { buildPaymentReceiptHtml } from './payment-receipt-print';

const sampleReceipt: PaymentReceiptView = {
  receiptNumber: 'BKT-REC-20260609-001',
  kind: 'RECEIVABLE_PAYMENT',
  amount: 1_500_000,
  method: 'CASH',
  createdAt: '2026-06-09T10:30:00.000Z',
  recordedByName: 'Kasir Demo',
  counterpartyName: 'PT Maju Jaya',
  counterpartyPhone: '08123456789',
  storeName: 'Toko Barokah',
  outletName: 'Cabang Utama',
  outstandingBefore: 3_000_000,
  outstandingAfter: 1_500_000,
  notes: 'Pelunasan sebagian',
  referenceLabel: 'TRX-100',
};

describe('payment-receipt-print', () => {
  it('buildPaymentReceiptHtml includes Indonesian receipt fields', () => {
    const html = buildPaymentReceiptHtml(sampleReceipt);
    expect(html).toMatch(/Bukti Pelunasan Piutang/);
    expect(html).toMatch(/BKT-REC-20260609-001/);
    expect(html).toMatch(/Toko Barokah/);
    expect(html).toMatch(/PT Maju Jaya/);
    expect(html).toMatch(/Dokumen ini bukti pembayaran sah/);
    expect(html).toMatch(/1\.500\.000/);
  });

  it('buildPaymentReceiptHtml covers deposit balance rows', () => {
    const depositReceipt: PaymentReceiptView = {
      ...sampleReceipt,
      kind: 'DEPOSIT_TOP_UP',
      receiptNumber: 'BKT-DEP-20260609-002',
      balanceBefore: 500_000,
      balanceAfter: 2_000_000,
      outstandingBefore: null,
      outstandingAfter: null,
    };
    const html = buildPaymentReceiptHtml(depositReceipt);
    expect(html).toMatch(PAYMENT_RECEIPT_KIND_TITLES.DEPOSIT_TOP_UP);
    expect(html).toMatch(/Saldo sebelum/);
    expect(html).toMatch(/Saldo sesudah/);
  });
});
