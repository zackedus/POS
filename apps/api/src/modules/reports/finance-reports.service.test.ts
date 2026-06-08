import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { PaymentMethod } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FinanceReportsService } from './finance-reports.service';
import {
  resolveFinanceReportRange,
  resolveMonthRangeForAnchorJakarta,
  resolveWeekRangeForAnchorJakarta,
} from '../../common/utils/report-date.util';

function createOwner(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.OWNER,
    outletIds: ['outlet-1', 'outlet-2'],
  };
}

test('resolveFinanceReportRange: month preset for June 2026', () => {
  const range = resolveFinanceReportRange({ period: 'month', date: '2026-06-15' });
  assert.equal(range.dateFrom, '2026-06-01');
  assert.equal(range.dateTo, '2026-06-30');
  assert.equal(range.isRange, true);
});

test('resolveFinanceReportRange: week preset contains anchor Wednesday', () => {
  const range = resolveWeekRangeForAnchorJakarta('2026-06-03');
  assert.equal(range.dateFrom, '2026-06-01');
  assert.equal(range.dateTo, '2026-06-07');
});

test('resolveFinanceReportRange: custom from/to overrides period', () => {
  const range = resolveFinanceReportRange({
    period: 'month',
    from: '2026-05-10',
    to: '2026-05-20',
  });
  assert.equal(range.dateFrom, '2026-05-10');
  assert.equal(range.dateTo, '2026-05-20');
});

test('resolveMonthRangeForAnchorJakarta: February leap year', () => {
  const range = resolveMonthRangeForAnchorJakarta('2028-02-14');
  assert.equal(range.dateFrom, '2028-02-01');
  assert.equal(range.dateTo, '2028-02-29');
});

test('FinanceReportsService: profit-loss calculates net profit', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async () => ({ _sum: { total: '1000000' }, _count: { _all: 5 } }),
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: '100000' } }),
    },
    transactionItem: {
      findMany: async () => [
        {
          quantity: '2',
          productName: 'Cat Tembok 20L',
          subtotal: '600000',
          product: { costPrice: '300000', category: { name: 'Cat & Finishing' } },
        },
        {
          quantity: '1',
          productName: 'Kuas 4"',
          subtotal: '50000',
          product: { costPrice: '100000', category: null },
        },
      ],
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: '150000' } }),
      groupBy: async () => [{ category: 'OPERATIONAL', _sum: { amount: '150000' } }],
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '700000' }, _count: { id: 3 } },
        { method: PaymentMethod.CREDIT, _sum: { amount: '300000' }, _count: { id: 2 } },
      ],
    },
  };

  const service = new FinanceReportsService(prisma as never);
  const result = await service.getProfitLoss(createOwner(), {
    outletId: 'outlet-1',
    period: 'month',
    date: '2026-06-01',
  });

  assert.equal(result.revenue.grossSales, 1_000_000);
  assert.equal(result.revenue.voidRefund, 100_000);
  assert.equal(result.revenue.netSales, 900_000);
  assert.equal(result.cogs, 700_000);
  assert.equal(result.grossProfit, 200_000);
  assert.equal(result.operatingExpenses, 150_000);
  assert.equal(result.netProfit, 50_000);
  assert.equal(result.meta.period, 'month');
  assert.equal(result.meta.outletId, 'outlet-1');
  assert.ok(result.breakdown.sections.length >= 4);
  assert.equal(result.breakdown.sections[0]?.title, 'Rincian Penjualan per Metode Bayar');
  assert.equal(result.breakdown.sections[0]?.rows.length, 2);
  assert.equal(result.breakdown.sections[1]?.rows[0]?.label, 'Cat & Finishing');
});

test('FinanceReportsService: profit-loss tenant-wide without outletId', async () => {
  const prisma = {
    transaction: {
      aggregate: async () => ({ _sum: { total: '500000' }, _count: { _all: 2 } }),
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: '0' } }),
    },
    transactionItem: { findMany: async () => [] },
    expense: {
      aggregate: async () => ({ _sum: { amount: '50000' } }),
      groupBy: async () => [{ category: 'OTHER', _sum: { amount: '50000' } }],
    },
    payment: { groupBy: async () => [] },
  };

  const service = new FinanceReportsService(prisma as never);
  const result = await service.getProfitLoss(createOwner(), { period: 'day', date: '2026-06-09' });

  assert.equal(result.meta.outletId, null);
  assert.equal(result.revenue.netSales, 500_000);
  assert.equal(result.netProfit, 450_000);
});

test('FinanceReportsService: cash-flow aggregates in and out', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    payment: {
      aggregate: async () => ({ _sum: { amount: '400000' } }),
    },
    receivablePayment: {
      aggregate: async () => ({ _sum: { amount: '200000' } }),
      groupBy: async () => [{ method: PaymentMethod.CASH, _sum: { amount: '200000' }, _count: { id: 1 } }],
    },
    payablePayment: {
      aggregate: async () => ({ _sum: { amount: '100000' } }),
    },
    expense: {
      aggregate: async () => ({ _sum: { amount: '50000' } }),
      groupBy: async () => [{ category: 'OPERATIONAL', _sum: { amount: '50000' } }],
    },
    depositTransaction: {
      aggregate: async () => ({ _sum: { amount: '50000' }, _count: { id: 1 } }),
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: '25000' } }),
    },
  };

  const service = new FinanceReportsService(prisma as never);
  const result = await service.getCashFlow(createOwner(), {
    outletId: 'outlet-1',
    from: '2026-06-01',
    to: '2026-06-30',
  });

  assert.equal(result.cashIn.cashSales, 400_000);
  assert.equal(result.cashIn.receivableCollections, 200_000);
  assert.equal(result.cashIn.total, 650_000);
  assert.equal(result.cashOut.payablePayments, 100_000);
  assert.equal(result.cashOut.operatingExpenses, 50_000);
  assert.equal(result.cashOut.total, 175_000);
  assert.equal(result.netCashFlow, 475_000);
  assert.equal(result.meta.period, 'custom');
  assert.ok(result.breakdown.sections.some((section) => section.title === 'Rincian Kas Masuk'));
});

test('FinanceReportsService: daily-summary includes payment mix', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async () => ({ _sum: { total: '300000' }, _count: { _all: 3 } }),
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: '0' } }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '200000' }, _count: { id: 2 } },
        { method: PaymentMethod.CREDIT, _sum: { amount: '100000' }, _count: { id: 1 } },
      ],
    },
    receivable: { findMany: async () => [{ amount: '100000' }] },
    payable: { findMany: async () => [] },
    transactionItem: {
      groupBy: async () => [
        {
          productName: 'Semen 40kg',
          _sum: { quantity: '10', subtotal: '150000' },
          _count: { id: 5 },
        },
      ],
    },
    expense: { findMany: async () => [] },
    shift: { findMany: async () => [] },
  };

  const service = new FinanceReportsService(prisma as never);
  const result = await service.getDailySummary(createOwner(), {
    outletId: 'outlet-1',
    date: '2026-06-09',
  });

  assert.equal(result.omzet.gross, 300_000);
  assert.equal(result.newReceivables.count, 1);
  assert.equal(result.newReceivables.amount, 100_000);
  assert.equal(result.paymentMix.length, 2);
  assert.ok(result.breakdown.sections.some((section) => section.title === 'Top 10 Produk Terjual'));
  assert.equal(
    result.breakdown.sections.find((section) => section.title === 'Top 10 Produk Terjual')?.rows[0]?.label,
    'Semen 40kg',
  );
});

test('FinanceReportsService: rejects unknown outlet', async () => {
  const prisma = {
    outlet: { findFirst: async () => null },
  };

  const service = new FinanceReportsService(prisma as never);

  await assert.rejects(
    () =>
      service.getProfitLoss(createOwner(), {
        outletId: 'outlet-unknown',
        period: 'month',
        date: '2026-06-01',
      }),
    NotFoundException,
  );
});
