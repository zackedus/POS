import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnprocessableEntityException } from '@nestjs/common';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import { computeOutstanding, computePayableStatus, computeReceivableStatus, computeAgingBucket, computeDaysOverdue, emptyAgingTotals, AGING_BUCKET_ORDER } from './finance.util';
import { FinanceCheckoutService } from './finance-checkout.service';
import { FinanceSummaryService } from './finance-summary.service';

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

test('Finance util: aging bucket boundaries', () => {
  assert.equal(computeAgingBucket(0), 'CURRENT');
  assert.equal(computeAgingBucket(1), 'DAYS_0_30');
  assert.equal(computeAgingBucket(30), 'DAYS_0_30');
  assert.equal(computeAgingBucket(31), 'DAYS_31_60');
  assert.equal(computeAgingBucket(60), 'DAYS_31_60');
  assert.equal(computeAgingBucket(61), 'DAYS_61_90');
  assert.equal(computeAgingBucket(90), 'DAYS_61_90');
  assert.equal(computeAgingBucket(91), 'DAYS_90_PLUS');
});

test('Finance util: days overdue from due date', () => {
  const asOf = new Date('2026-06-09T00:00:00.000Z');
  assert.equal(computeDaysOverdue(new Date('2026-06-09'), asOf), 0);
  assert.equal(computeDaysOverdue(new Date('2026-06-08'), asOf), 1);
  assert.equal(computeDaysOverdue(new Date('2026-05-10'), asOf), 30);
  assert.equal(computeDaysOverdue(null, asOf), 0);
});

test('Finance util: empty aging totals initialized', () => {
  const totals = emptyAgingTotals();
  assert.equal(totals.CURRENT.count, 0);
  assert.equal(totals.DAYS_90_PLUS.amount, 0);
  assert.equal(AGING_BUCKET_ORDER.length, 5);
});

test('Finance summary: aggregates outstanding totals', async () => {
  const prisma = {
    receivable: {
      findMany: async (args: { where: { dueDate?: unknown } }) => {
        if (args.where.dueDate) {
          return [{ amount: { toString: () => '50000' }, paidAmount: { toString: () => '0' } }];
        }
        return [
          { amount: { toString: () => '100000' }, paidAmount: { toString: () => '20000' } },
          { amount: { toString: () => '50000' }, paidAmount: { toString: () => '0' } },
        ];
      },
    },
    payable: {
      findMany: async () => [
        { amount: { toString: () => '200000' }, paidAmount: { toString: () => '50000' } },
      ],
    },
    customerDeposit: {
      aggregate: async () => ({ _sum: { balance: { toString: () => '75000' } } }),
    },
    payment: {
      groupBy: async () => [{ _sum: { amount: { toString: () => '340000' } } }],
    },
  };
  const service = new FinanceSummaryService(prisma as never);
  const result = await service.getSummary(
    { tenantId: 'tenant-1', sub: 'user-1', role: 'OWNER', outletIds: ['outlet-1'] } as never,
    { outletId: 'outlet-1', date: '2026-06-09' },
  );
  assert.equal(result.receivableOutstanding, 130_000);
  assert.equal(result.payableOutstanding, 150_000);
  assert.equal(result.depositBalance, 75_000);
  assert.equal(result.cashToday, 340_000);
  assert.equal(result.overdueReceivableCount, 1);
  assert.equal(result.overdueReceivableAmount, 50_000);
});

test('Finance summary: customer statement opening balance', async () => {
  const fromDate = new Date('2026-06-01T00:00:00.000Z');
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        name: 'PT ABC',
        phone: '08123456789',
        creditLimit: { toString: () => '5000000' },
      }),
    },
    receivable: {
      findMany: async () => [
        {
          id: 'recv-1',
          status: 'PARTIAL',
          amount: { toString: () => '100000' },
          createdAt: new Date('2026-05-15T00:00:00.000Z'),
          transaction: { receiptNo: 'TRX-001' },
          payments: [
            { id: 'pay-1', amount: { toString: () => '30000' }, method: 'CASH', reference: null, createdAt: new Date('2026-05-20T00:00:00.000Z') },
            { id: 'pay-2', amount: { toString: () => '20000' }, method: 'TRANSFER', reference: 'TRF-1', createdAt: new Date('2026-06-05T00:00:00.000Z') },
          ],
        },
        {
          id: 'recv-2',
          status: 'OPEN',
          amount: { toString: () => '50000' },
          createdAt: new Date('2026-07-01T00:00:00.000Z'),
          transaction: null,
          payments: [],
        },
      ],
    },
    customerDeposit: {
      findUnique: async () => ({ balance: { toString: () => '25000' }, status: 'ACTIVE', tenantId: 'tenant-1' }),
    },
  };
  const { ReceivablesService } = await import('./receivables.service');
  const service = new ReceivablesService(prisma as never, { getCustomerFinanceSummary: async () => null } as never);
  const statement = await service.getCustomerStatement(
    { tenantId: 'tenant-1', sub: 'user-1', role: 'OWNER', outletIds: [] } as never,
    'cust-1',
    { from: '2026-06-01', to: '2026-06-30' },
  );
  assert.equal(statement.openingBalance, 70_000);
  assert.equal(statement.entries.length, 1);
  assert.equal(statement.entries[0]?.credit, 20_000);
  assert.equal(statement.closingBalance, 50_000);
  assert.equal(statement.depositBalance, 25_000);
  assert.ok(fromDate);
});
