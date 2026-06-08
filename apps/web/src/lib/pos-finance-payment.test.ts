import { describe, expect, it } from 'vitest';
import {
  buildDepositPlusCreditPayments,
  canCheckoutDepositPlusCredit,
  canCheckoutFullDeposit,
  canSelectFinancePaymentMode,
  computeDepositApplyAmount,
  computeDepositShortfall,
  FINANCE_CUSTOMER_REQUIRED_MESSAGE,
  getCreditLimitStatus,
  isFinancePaymentButtonDisabled,
  isFinancePaymentMode,
  needsCustomerPickerForFinance,
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

  it('keeps finance payment buttons clickable (picker opens instead)', () => {
    expect(isFinancePaymentButtonDisabled('CREDIT', null)).toBe(false);
    expect(isFinancePaymentButtonDisabled('DEPOSIT', undefined)).toBe(false);
    expect(isFinancePaymentButtonDisabled('CASH', null)).toBe(false);
  });

  it('detects when customer picker is required for finance modes', () => {
    expect(needsCustomerPickerForFinance('CREDIT', null)).toBe(true);
    expect(needsCustomerPickerForFinance('DEPOSIT', null)).toBe(true);
    expect(needsCustomerPickerForFinance('CREDIT', 'cust-1')).toBe(false);
    expect(needsCustomerPickerForFinance('CASH', null)).toBe(false);
  });

  it('computes partial deposit apply and shortfall', () => {
    expect(computeDepositApplyAmount(50_000, 120_000)).toBe(50_000);
    expect(computeDepositShortfall(50_000, 120_000)).toBe(70_000);
    expect(computeDepositApplyAmount(200_000, 120_000)).toBe(120_000);
    expect(computeDepositShortfall(200_000, 120_000)).toBe(0);
  });

  it('builds deposit plus credit split payments', () => {
    expect(buildDepositPlusCreditPayments(50_000, 120_000)).toEqual([
      { method: 'DEPOSIT', amount: 50_000 },
      { method: 'CREDIT', amount: 70_000 },
    ]);
  });

  it('flags credit near limit and over limit', () => {
    expect(
      getCreditLimitStatus({
        creditLimit: 1_000_000,
        creditAvailable: 200_000,
        receivableOutstanding: 800_000,
        additionalCreditAmount: 50_000,
      }),
    ).toBe('warning');

    expect(
      getCreditLimitStatus({
        creditLimit: 1_000_000,
        creditAvailable: 100_000,
        receivableOutstanding: 900_000,
        additionalCreditAmount: 150_000,
      }),
    ).toBe('over');
  });

  it('allows deposit plus credit when shortfall fits available credit', () => {
    expect(
      canCheckoutDepositPlusCredit({
        depositBalance: 50_000,
        cartTotal: 120_000,
        creditLimit: 1_000_000,
        creditAvailable: 200_000,
        receivableOutstanding: 800_000,
      }),
    ).toBe(true);
    expect(canCheckoutFullDeposit(200_000, 120_000)).toBe(true);
    expect(canCheckoutFullDeposit(50_000, 120_000)).toBe(false);
  });

  it('uses Indonesian guidance message for finance payments', () => {
    expect(FINANCE_CUSTOMER_REQUIRED_MESSAGE).toContain('Pilih pelanggan terlebih dahulu');
  });
});
