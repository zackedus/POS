import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@barokah/database';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ReportsService } from './reports.service';
import { AnalyticsPeriodDays } from './dto/analytics-query.dto';

function createManager(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.MANAGER,
    outletIds: ['outlet-1'],
  };
}

test('Reports: getAnalytics aggregates margin by category', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    transactionItem: {
      findMany: async () => [
        {
          productId: 'p1',
          productName: 'Semen 40kg',
          quantity: '2',
          subtotal: '200000',
          product: {
            costPrice: '70000',
            category: { id: 'cat-1', name: 'Semen' },
          },
          transaction: { completedAt: new Date('2026-06-05T10:00:00Z') },
        },
        {
          productId: 'p2',
          productName: 'Cat Tembok',
          quantity: '1',
          subtotal: '80000',
          product: {
            costPrice: '50000',
            category: { id: 'cat-2', name: 'Cat' },
          },
          transaction: { completedAt: new Date('2026-06-06T10:00:00Z') },
        },
      ],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getAnalytics(createManager(), {
    outletId: 'outlet-1',
    days: AnalyticsPeriodDays.DAYS_7,
  });

  assert.equal(result.outletId, 'outlet-1');
  assert.equal(result.summary.revenue, 280_000);
  assert.equal(result.marginByCategory.length, 2);
  assert.equal(result.topProducts.length, 2);
  assert.ok(result.salesTrend.length >= 1);
});

test('Reports: exportAnalyticsMargin returns CSV with BOM', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    transactionItem: {
      findMany: async () => [
        {
          productId: 'p1',
          productName: 'Semen 40kg',
          quantity: '1',
          subtotal: '100000',
          product: {
            costPrice: '70000',
            category: { id: 'cat-1', name: 'Semen' },
          },
          transaction: { completedAt: new Date('2026-06-05T10:00:00Z') },
        },
      ],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.exportAnalyticsMargin(createManager(), {
    outletId: 'outlet-1',
    days: AnalyticsPeriodDays.DAYS_7,
  });

  assert.equal(result.format, 'csv');
  assert.match(result.filename, /analitik-margin-7hari/);
  assert.match(result.body, /^\uFEFF/);
  assert.match(result.body, /Semen/);
});

test('Reports: getAnalyticsSummary returns decision-ready pulse and insights', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
      findMany: async () => [],
    },
    transaction: {
      aggregate: async (args: { where: { completedAt?: { gte: Date } } }) => {
        const isCurrent = args.where.completedAt?.gte?.getTime() === new Date('2026-06-09T00:00:00+07:00').getTime();
        return {
          _sum: { total: isCurrent ? '500000' : '400000' },
          _count: { _all: isCurrent ? 5 : 4 },
        };
      },
      groupBy: async () => [],
      findMany: async () => [
        { completedAt: new Date('2026-06-09T04:00:00.000Z'), total: '200000' },
        { completedAt: new Date('2026-06-09T06:00:00.000Z'), total: '300000' },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: null } }),
    },
    payment: {
      groupBy: async () => [
        { method: 'CASH', _sum: { amount: '300000' }, _count: { id: 3 } },
        { method: 'QRIS', _sum: { amount: '200000' }, _count: { id: 2 } },
      ],
    },
    transactionItem: {
      findMany: async (args: { where: { transaction?: { completedAt?: { gte: Date } } } }) => {
        const isPrevious = Boolean(args.where.transaction?.completedAt?.gte);
        if (isPrevious && args.where.transaction?.completedAt?.gte?.getTime() === new Date('2026-06-08T00:00:00+07:00').getTime()) {
          return [
            {
              subtotal: '400000',
              quantity: '4',
              product: { costPrice: '50000' },
            },
          ];
        }
        return [
          {
            productId: 'p1',
            productName: 'Semen 40kg',
            quantity: '10',
            subtotal: '500000',
            product: {
              costPrice: '70000',
              category: { id: 'cat-1', name: 'Semen' },
            },
            transaction: {
              completedAt: new Date('2026-06-09T04:00:00.000Z'),
              outletId: 'outlet-1',
              outlet: { name: 'Cabang Utama' },
            },
          },
        ];
      },
    },
    receivable: {
      findMany: async (args: { where: { dueDate?: unknown } }) => {
        if (args.where.dueDate) {
          return [{ amount: '100000', paidAmount: '0' }];
        }
        return [{ amount: '200000', paidAmount: '50000' }];
      },
    },
    payable: {
      findMany: async () => [],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getAnalyticsSummary(createManager(), {
    outletId: 'outlet-1',
    period: 'day',
    date: '2026-06-09',
  });

  assert.equal(result.period, 'day');
  assert.equal(result.pulse.netSales.current, 500_000);
  assert.equal(result.pulse.transactionCount.current, 5);
  assert.equal(result.topProducts[0]?.productName, 'Semen 40kg');
  assert.equal(result.paymentMethods.length, 2);
  assert.equal(result.financeSnapshot.receivablesOutstanding, 150_000);
  assert.ok(result.insights.length >= 1);
  assert.ok(result.salesTrend.length >= 1);
});

test('Reports: exportAnalyticsScheduled returns weekly preset CSV', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    transactionItem: {
      findMany: async () => [],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.exportAnalyticsScheduled(createManager(), {
    outletId: 'outlet-1',
    preset: 'week' as never,
  });

  assert.equal(result.format, 'csv');
  assert.match(result.filename, /analitik-minggu-ini/);
  assert.equal(result.preset, 'week');
});
