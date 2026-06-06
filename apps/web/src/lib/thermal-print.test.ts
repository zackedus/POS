import { describe, expect, it } from 'vitest';
import {
  buildEscPosReceiptFromDto,
  formatEscPosIntegrationHint,
  formatWebUsbIntegrationHint,
  paymentMethodLabel,
  printEscPosWebUsbStub,
  renderEscPosPreview,
} from './thermal-print';
import type { EscPosStub } from './transactions';

describe('thermal-print helpers', () => {
  it('labels payment methods in Indonesian', () => {
    expect(paymentMethodLabel('CASH')).toBe('Tunai');
    expect(paymentMethodLabel('TRANSFER')).toBe('Transfer');
  });

  it('describes ESC/POS stub for integration placeholder', () => {
    const stub: EscPosStub = {
      format: 'escpos',
      encoding: 'base64',
      width: 32,
      payload: 'dGVzdA==',
      commands: ['INIT', 'TEXT', 'CUT'],
    };
    expect(formatEscPosIntegrationHint(stub)).toMatch(/Stub ESC\/POS/);
    expect(formatEscPosIntegrationHint(stub)).toMatch(/integrasi hardware/i);
  });

  it('renders ESC/POS preview with command tokens', () => {
    const stub: EscPosStub = {
      format: 'escpos',
      encoding: 'base64',
      width: 32,
      payload: btoa('\x1b@Toko Barokah\n\x1dV\x00'),
      commands: ['INIT', 'TEXT', 'CUT'],
    };
    expect(renderEscPosPreview(stub)).toMatch(/\[INIT\]/);
    expect(renderEscPosPreview(stub)).toMatch(/Toko Barokah/);
    expect(renderEscPosPreview(stub)).toMatch(/\[CUT\]/);
  });

  it('buildEscPosReceiptFromDto includes receipt header and total', () => {
    const receipt = {
      receiptNo: 'RCPT-1',
      transactionId: 'trx-1',
      tenantName: 'Toko Barokah',
      outlet: { id: 'o1', name: 'Cabang Utama', code: 'MAIN', address: 'Jl. Test' },
      cashier: { id: 'u1', fullName: 'Kasir Demo' },
      status: 'COMPLETED',
      items: [{ name: 'Semen', quantity: 2, unitPrice: 65000, subtotal: 130000 }],
      payments: [{ method: 'CASH', amount: 130000, reference: null }],
      subtotal: 130000,
      discount: 0,
      tax: 0,
      total: 130000,
      netTotal: 130000,
      notes: null,
      completedAt: '2026-06-06T10:00:00.000Z',
      adjustments: [],
      refundedTotal: 0,
    };
    const text = buildEscPosReceiptFromDto(receipt);
    expect(text).toMatch(/Toko Barokah/);
    expect(text).toMatch(/TOTAL/);
  });

  it('describes WebUSB stub availability', () => {
    expect(formatWebUsbIntegrationHint()).toMatch(/WebUSB|Bluetooth|Cetak Struk/i);
  });

  it('printEscPosWebUsbStub accepts preview text', async () => {
    const result = await printEscPosWebUsbStub('Toko Barokah\nTotal 100.000');
    expect(result.message.length).toBeGreaterThan(0);
  });
});
