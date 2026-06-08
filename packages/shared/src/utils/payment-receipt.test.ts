import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPaymentReceiptNumber, PAYMENT_RECEIPT_KIND_TITLES } from './payment-receipt';

test('buildPaymentReceiptNumber formats daily sequence', () => {
  assert.equal(
    buildPaymentReceiptNumber('DEP', '2026-06-09', 1),
    'BKT-DEP-20260609-001',
  );
  assert.equal(
    buildPaymentReceiptNumber('REC', new Date('2026-06-09T10:00:00.000Z'), 42),
    'BKT-REC-20260609-042',
  );
});

test('PAYMENT_RECEIPT_KIND_TITLES are Indonesian', () => {
  assert.match(PAYMENT_RECEIPT_KIND_TITLES.RECEIVABLE_PAYMENT, /Piutang/);
  assert.match(PAYMENT_RECEIPT_KIND_TITLES.PAYABLE_PAYMENT, /Utang/);
  assert.match(PAYMENT_RECEIPT_KIND_TITLES.DEPOSIT_TOP_UP, /Deposit/);
});
