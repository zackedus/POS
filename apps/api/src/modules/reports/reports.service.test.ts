import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ReportsService } from './reports.service';

function createManager(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.MANAGER,
    outletIds: ['outlet-1'],
  };
}

function createOwner(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.OWNER,
    outletIds: ['outlet-1', 'outlet-2'],
  };
}

function createOwnerSingleOutlet(): AuthJwtPayload {
  return {
    ...createOwner(),
    outletIds: ['outlet-1'],
  };
}

test('SCR-R01: getDailySales aggregates omzet, count, and payment mix', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    transaction: {
      aggregate: async () => ({
        _sum: { total: '350000' },
        _count: { _all: 2 },
      }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '200000' }, _count: { id: 1 } },
        { method: PaymentMethod.QRIS, _sum: { amount: '150000' }, _count: { id: 1 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({
        _sum: { amount: '50000' },
        _count: { _all: 1 },
      }),
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getDailySales(createManager(), {
    outletId: 'outlet-1',
    date: '2026-06-02',
  });

  assert.equal(result.outletId, 'outlet-1');
  assert.equal(result.date, '2026-06-02');
  assert.equal(result.transactionCount, 2);
  assert.equal(result.grossOmzet, 350_000);
  assert.equal(result.voidRefundTotal, 50_000);
  assert.equal(result.netOmzet, 300_000);
  assert.equal(result.paymentMix.length, 2);
  assert.equal(result.paymentMix[0]?.method, PaymentMethod.CASH);
  assert.equal(result.paymentMix[0]?.amount, 200_000);
});

test('SCR-R01: getDailySales rejects outlet outside tenant', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => null,
    },
  };

  const service = new ReportsService(prisma as never);

  await assert.rejects(
    () =>
      service.getDailySales(createOwner(), {
        outletId: 'outlet-unknown',
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.NOT_FOUND);
      return true;
    },
  );
});

test('SCR-R01: manager without outlet access cannot query reports', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => {
        throw new Error('should not query outlet when forbidden');
      },
    },
  };

  const service = new ReportsService(prisma as never);
  const managerOtherOutlet: AuthJwtPayload = {
    ...createManager(),
    outletIds: ['outlet-2'],
  };

  await assert.rejects(
    () =>
      service.getDailySales(managerOtherOutlet, {
        outletId: 'outlet-1',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_PERMISSION);
      return true;
    },
  );
});

test('SCR-R02: getDashboard includes pulse and shift summaries', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    transaction: {
      aggregate: async () => ({
        _sum: { total: '100000' },
        _count: { _all: 1 },
      }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '100000' }, _count: { id: 1 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({
        _sum: { amount: null },
        _count: { _all: 0 },
      }),
    },
    shift: {
      count: async () => 1,
      findMany: async () => [
        {
          id: 'shift-1',
          outletId: 'outlet-1',
          cashierId: 'cashier-1',
          openingCash: '50000',
          closingCash: null,
          expectedCash: null,
          difference: null,
          openedAt: new Date('2026-06-02T01:00:00.000Z'),
          closedAt: null,
          cashier: { id: 'cashier-1', fullName: 'Kasir A' },
          transactions: [{ total: '100000' }],
        },
      ],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getDashboard(createManager(), {
    outletId: 'outlet-1',
    date: '2026-06-02',
  });

  assert.equal(result.pulse.grossOmzet, 100_000);
  assert.equal(result.operations.activeShifts, 1);
  assert.equal(result.shiftSummaries.length, 1);
  assert.equal(result.shiftSummaries[0]?.cashierName, 'Kasir A');
  assert.equal(result.shiftSummaries[0]?.isOpen, true);
});

test('SCR-R02: getShiftSummaries returns per-shift totals', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1' }),
    },
    shift: {
      findMany: async () => [
        {
          id: 'shift-closed',
          outletId: 'outlet-1',
          cashierId: 'cashier-2',
          openingCash: '100000',
          closingCash: '450000',
          expectedCash: '440000',
          difference: '10000',
          openedAt: new Date('2026-06-02T00:30:00.000Z'),
          closedAt: new Date('2026-06-02T10:00:00.000Z'),
          cashier: { id: 'cashier-2', fullName: 'Kasir B' },
          transactions: [{ total: '340000' }],
        },
      ],
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getShiftSummaries(createManager(), {
    outletId: 'outlet-1',
    date: '2026-06-02',
  });

  assert.equal(result.shifts.length, 1);
  assert.equal(result.shifts[0]?.grossOmzet, 340_000);
  assert.equal(result.shifts[0]?.closingCash, 450_000);
  assert.equal(result.shifts[0]?.isOpen, false);
});

test('SCR-R03: listOutlets returns all tenant outlets for owner', async () => {
  const prisma = {
    outlet: {
      findMany: async (args: { where: { tenantId: string } }) => {
        assert.equal(args.where.tenantId, 'tenant-1');
        return [
          { id: 'outlet-1', name: 'Cabang A', code: 'A', address: 'Jl. A' },
          { id: 'outlet-2', name: 'Cabang B', code: 'B', address: null },
        ];
      },
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.listOutlets(createOwner());

  assert.equal(result.outlets.length, 2);
  assert.equal(result.requiresOutletSelection, true);
  assert.equal(result.defaultOutletId, null);
});

test('SCR-R03: listOutlets scopes manager to assigned outlets only', async () => {
  const prisma = {
    outlet: {
      findMany: async (args: { where: { id?: { in: string[] } } }) => {
        assert.deepEqual(args.where.id?.in, ['outlet-1']);
        return [{ id: 'outlet-1', name: 'Cabang A', code: 'A', address: null }];
      },
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.listOutlets(createManager());

  assert.equal(result.outlets.length, 1);
  assert.equal(result.requiresOutletSelection, false);
  assert.equal(result.defaultOutletId, 'outlet-1');
});

test('SCR-R03: owner with multiple outlets must pass outletId for daily report', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
  };

  const service = new ReportsService(prisma as never);

  await assert.rejects(
    () => service.getDailySales(createOwner(), { date: '2026-06-02' }),
    (error: unknown) => {
      assert.ok(error instanceof BadRequestException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_INPUT);
      return true;
    },
  );
});

test('SCR-R04: exportDailySales returns JSON payload with exportedAt', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async () => ({
        _sum: { total: '100000' },
        _count: { _all: 1 },
      }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '100000' }, _count: { id: 1 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({
        _sum: { amount: null },
        _count: { _all: 0 },
      }),
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.exportDailySales(createOwnerSingleOutlet(), {
    outletId: 'outlet-1',
    date: '2026-06-02',
    format: 'json',
  });

  assert.equal(result.format, 'json');
  assert.ok('exportedAt' in result);
  assert.equal(result.report.grossOmzet, 100_000);
});

test('SCR-R04: exportDailySales returns CSV body with UTF-8 BOM', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async () => ({
        _sum: { total: '250000' },
        _count: { _all: 2 },
      }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.TRANSFER, _sum: { amount: '250000' }, _count: { id: 2 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({
        _sum: { amount: null },
        _count: { _all: 0 },
      }),
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.exportDailySales(createOwnerSingleOutlet(), {
    outletId: 'outlet-1',
    date: '2026-06-02',
    format: 'csv',
  });

  assert.equal(result.format, 'csv');
  assert.ok(result.body.startsWith('\uFEFF'));
  assert.match(result.body, /grossOmzet,250000/);
  assert.match(result.filename, /laporan-harian-2026-06-02/);
});

test('SCR-R04: exportDailySales returns PDF buffer', async () => {
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async () => ({
        _sum: { total: '250000' },
        _count: { _all: 2 },
      }),
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.TRANSFER, _sum: { amount: '250000' }, _count: { id: 2 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({
        _sum: { amount: null },
        _count: { _all: 0 },
      }),
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.exportDailySales(createOwnerSingleOutlet(), {
    outletId: 'outlet-1',
    dateFrom: '2026-06-01',
    dateTo: '2026-06-03',
    format: 'pdf',
  });

  assert.equal(result.format, 'pdf');
  assert.ok(result.body.toString('utf8').startsWith('%PDF-1.4'));
  assert.match(result.filename, /laporan-rentang/);
});

test('SCR-R05: getDailySales aggregates date range', async () => {
  let capturedStart: Date | undefined;
  let capturedEnd: Date | undefined;

  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    transaction: {
      aggregate: async (args: { where: { completedAt: { gte: Date; lt: Date } } }) => {
        capturedStart = args.where.completedAt.gte;
        capturedEnd = args.where.completedAt.lt;
        return { _sum: { total: '500000' }, _count: { _all: 5 } };
      },
    },
    payment: {
      groupBy: async () => [
        { method: PaymentMethod.CASH, _sum: { amount: '500000' }, _count: { id: 5 } },
      ],
    },
    transactionAdjustment: {
      aggregate: async () => ({ _sum: { amount: null }, _count: { _all: 0 } }),
    },
  };

  const service = new ReportsService(prisma as never);
  const result = await service.getDailySales(createManager(), {
    outletId: 'outlet-1',
    dateFrom: '2026-06-01',
    dateTo: '2026-06-03',
  });

  assert.equal(result.isRange, true);
  assert.equal(result.dateFrom, '2026-06-01');
  assert.equal(result.dateTo, '2026-06-03');
  assert.equal(result.transactionCount, 5);
  assert.ok(capturedStart instanceof Date);
  assert.ok(capturedEnd instanceof Date);
  assert.ok((capturedEnd!.getTime() - capturedStart!.getTime()) / (24 * 60 * 60 * 1000) >= 3);
});

