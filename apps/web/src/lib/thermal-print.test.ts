import { describe, expect, it } from 'vitest';
import { formatEscPosIntegrationHint, paymentMethodLabel } from './thermal-print';
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
});
