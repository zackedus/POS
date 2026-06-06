import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEscPosStub, type DigitalReceiptPayload } from './receipt.util';

const sampleReceipt: DigitalReceiptPayload = {
  receiptNo: 'TRX-100',
  transactionId: 'txn-1',
  outlet: { id: 'out-1', name: 'Cabang Utama', code: 'MAIN', address: 'Jl. Contoh' },
  tenantName: 'Barokah Toko Bangunan',
  cashier: { id: 'u1', fullName: 'Kasir Demo' },
  status: 'COMPLETED',
  items: [{ name: 'Semen', quantity: 2, unitPrice: 75000, subtotal: 150000 }],
  payments: [{ method: 'CASH', amount: 150000, reference: null }],
  subtotal: 150000,
  discount: 0,
  tax: 0,
  total: 150000,
  notes: null,
  completedAt: new Date('2026-06-02T10:00:00Z'),
  adjustments: [],
  refundedTotal: 0,
  netTotal: 150000,
};

test('SCR-V04: buildEscPosStub returns base64 escpos payload', () => {
  const stub = buildEscPosStub(sampleReceipt);
  assert.equal(stub.format, 'escpos');
  assert.equal(stub.encoding, 'base64');
  assert.ok(stub.payload.length > 0);
  const decoded = Buffer.from(stub.payload, 'base64').toString('utf8');
  assert.match(decoded, /TRX-100/);
  assert.match(decoded, /Semen/);
});
