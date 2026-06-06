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
