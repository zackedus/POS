import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentMethod } from '@barokah/shared';
import { buildDailySalesCsv } from './daily-export.util';

test('buildDailySalesCsv includes summary and payment mix rows', () => {
  const csv = buildDailySalesCsv({
    outletId: 'outlet-1',
    date: '2026-06-02',
    timezone: 'Asia/Jakarta',
    transactionCount: 3,
    grossOmzet: 500_000,
    voidRefundCount: 1,
    voidRefundTotal: 50_000,
    netOmzet: 450_000,
    paymentMix: [
      {
        method: PaymentMethod.CASH,
        amount: 300_000,
        count: 2,
        sharePercent: 60,
      },
      {
        method: PaymentMethod.QRIS,
        amount: 200_000,
        count: 1,
        sharePercent: 40,
      },
    ],
  });

  assert.match(csv, /outletId,outlet-1/);
  assert.match(csv, /grossOmzet,500000/);
  assert.match(csv, /netOmzet,450000/);
  assert.match(csv, /CASH,Tunai,300000,2,60/);
  assert.match(csv, /QRIS,QRIS,200000,1,40/);
});
