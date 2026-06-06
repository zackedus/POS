import { describe, expect, it } from 'vitest';
import {
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

  it('describes WebUSB stub availability', () => {
    expect(formatWebUsbIntegrationHint()).toMatch(/WebUSB|Bluetooth|Cetak Struk/i);
  });

  it('printEscPosWebUsbStub accepts preview text', async () => {
    const result = await printEscPosWebUsbStub('Toko Barokah\nTotal 100.000');
    expect(result.message.length).toBeGreaterThan(0);
  });
});
