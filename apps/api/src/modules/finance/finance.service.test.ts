import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnprocessableEntityException } from '@nestjs/common';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import { computeOutstanding, computePayableStatus, computeReceivableStatus } from './finance.util';
import { FinanceCheckoutService } from './finance-checkout.service';

test('Finance util: receivable status transitions', () => {
  assert.equal(computeReceivableStatus(100_000, 0), 'OPEN');
  assert.equal(computeReceivableStatus(100_000, 40_000), 'PARTIAL');
  assert.equal(computeReceivableStatus(100_000, 100_000), 'PAID');
  assert.equal(computeReceivableStatus(100_000, 50_000, true), 'VOID');
});

test('Finance util: payable status transitions', () => {
  assert.equal(computePayableStatus(500_000, 0), 'OPEN');
  assert.equal(computePayableStatus(500_000, 500_000), 'PAID');
});

test('Finance util: outstanding never negative', () => {
  assert.equal(computeOutstanding(100_000, 120_000), 0);
});

test('Finance checkout: blocks credit without customer', () => {
  const service = new FinanceCheckoutService({} as never);
  assert.throws(
    () =>
      service.assertCheckoutFinancePayments({
        payments: [{ method: PaymentMethod.CREDIT, amount: 50_000 }],
        customerId: null,
        tenantId: 'tenant-1',
        customerCreditLimitIdr: null,
        customerOutstandingIdr: 0,
        depositBalanceIdr: 0,
      }),
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === ErrorCodes.FINANCE_CUSTOMER_REQUIRED,
  );
});

test('Finance checkout: blocks credit over limit', () => {
  const service = new FinanceCheckoutService({} as never);
  assert.throws(
    () =>
      service.assertCheckoutFinancePayments({
        payments: [{ method: PaymentMethod.CREDIT, amount: 50_000 }],
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        customerCreditLimitIdr: 100_000,
        customerOutstandingIdr: 80_000,
        depositBalanceIdr: 0,
      }),
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === ErrorCodes.CREDIT_LIMIT_EXCEEDED,
  );
});

test('Finance checkout: blocks deposit over balance', () => {
  const service = new FinanceCheckoutService({} as never);
  assert.throws(
    () =>
      service.assertCheckoutFinancePayments({
        payments: [{ method: PaymentMethod.DEPOSIT, amount: 30_000 }],
        customerId: 'cust-1',
        tenantId: 'tenant-1',
        customerCreditLimitIdr: null,
        customerOutstandingIdr: 0,
        depositBalanceIdr: 20_000,
      }),
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
  );
});

test('Finance checkout: partial receivable payment updates status', async () => {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    receivable: {
      findUnique: async () => ({
        id: 'recv-1',
        status: 'OPEN',
        amount: { toString: () => '100000' },
        paidAmount: { toString: () => '0' },
      }),
      update: async (args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return {};
      },
    },
    receivablePayment: {
      create: async () => ({ id: 'pay-1' }),
    },
  };
  const service = new FinanceCheckoutService(prisma as never);
  await service.recordReceivablePayment(prisma as never, {
    receivableId: 'recv-1',
    amountIdr: 40_000,
    method: PaymentMethod.CASH,
    recordedById: 'user-1',
  });
  assert.equal(updates[0]?.status, 'PARTIAL');
});

test('Finance checkout: full receivable payment marks PAID', async () => {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    receivable: {
      findUnique: async () => ({
        id: 'recv-1',
        status: 'PARTIAL',
        amount: { toString: () => '100000' },
        paidAmount: { toString: () => '60000' },
      }),
      update: async (args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return {};
      },
    },
    receivablePayment: {
      create: async () => ({ id: 'pay-2' }),
    },
  };
  const service = new FinanceCheckoutService(prisma as never);
  await service.recordReceivablePayment(prisma as never, {
    receivableId: 'recv-1',
    amountIdr: 40_000,
    method: PaymentMethod.TRANSFER,
    recordedById: 'user-1',
  });
  assert.equal(updates[0]?.status, 'PAID');
});
