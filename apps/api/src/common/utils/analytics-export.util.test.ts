import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAnalyticsMarginCsv } from './analytics-export.util';

test('buildAnalyticsMarginCsv includes summary and category rows', () => {
  const csv = buildAnalyticsMarginCsv({
    outletId: 'outlet-1',
    periodDays: 7,
    dateFrom: '2026-05-30',
    dateTo: '2026-06-06',
    timezone: 'Asia/Jakarta',
    summary: {
      revenue: 500_000,
      cost: 350_000,
      margin: 150_000,
      marginPercent: 30,
      itemCount: 12,
    },
    marginByCategory: [
      {
        categoryId: 'cat-1',
        categoryName: 'Semen',
        revenue: 300_000,
        cost: 200_000,
        margin: 100_000,
        marginPercent: 33.3,
        quantity: 5,
      },
    ],
  });

  assert.match(csv, /summaryRevenue,500000/);
  assert.match(csv, /Semen,300000/);
  assert.match(csv, /cat-1,Semen,300000,200000,100000,33.3,5/);
});
