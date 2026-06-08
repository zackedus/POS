import { describe, expect, it } from 'vitest';
import {
  canSelectFinancePaymentMode,
  FINANCE_CUSTOMER_REQUIRED_MESSAGE,
  isFinancePaymentButtonDisabled,
  isFinancePaymentMode,
} from './pos-finance-payment';

describe('pos-finance-payment', () => {
  it('identifies tempo and deposit as finance payment modes', () => {
    expect(isFinancePaymentMode('CREDIT')).toBe(true);
    expect(isFinancePaymentMode('DEPOSIT')).toBe(true);
    expect(isFinancePaymentMode('CASH')).toBe(false);
  });

  it('blocks tempo/deposit until customer is linked', () => {
    expect(canSelectFinancePaymentMode('CREDIT', null)).toBe(false);
    expect(canSelectFinancePaymentMode('DEPOSIT', null)).toBe(false);
    expect(canSelectFinancePaymentMode('CREDIT', 'cust-1')).toBe(true);
    expect(canSelectFinancePaymentMode('DEPOSIT', 'cust-1')).toBe(true);
    expect(canSelectFinancePaymentMode('CASH', null)).toBe(true);
  });

  it('disables tempo/deposit buttons without linked customer', () => {
    expect(isFinancePaymentButtonDisabled('CREDIT', null)).toBe(true);
    expect(isFinancePaymentButtonDisabled('DEPOSIT', undefined)).toBe(true);
    expect(isFinancePaymentButtonDisabled('CREDIT', 'cust-1')).toBe(false);
    expect(isFinancePaymentButtonDisabled('CASH', null)).toBe(false);
  });

  it('uses Indonesian guidance message for finance payments', () => {
    expect(FINANCE_CUSTOMER_REQUIRED_MESSAGE).toContain('Pilih pelanggan terlebih dahulu');
  });
});
