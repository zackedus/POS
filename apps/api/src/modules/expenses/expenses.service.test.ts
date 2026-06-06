import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException } from '@nestjs/common';
import type { AuthJwtPayload } from '../auth/auth.types';
import { ExpensesService } from './expenses.service';
import { ExpenseCategoryCode } from './dto/expense.dto';

const EXPENSE_CATEGORY = {
  OPERATIONAL: 'OPERATIONAL',
  LOADING_UNLOADING: 'LOADING_UNLOADING',
  SHIPPING: 'SHIPPING',
  OTHER: 'OTHER',
} as const;

function createUser(role: AuthJwtPayload['role'] = 'MANAGER'): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role,
    outletIds: ['outlet-1'],
  };
}

test('Expenses: createExpense records operational expense', async () => {
  let createdPayload: Record<string, unknown> | undefined;
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    expense: {
      create: async (args: { data: Record<string, unknown> }) => {
        createdPayload = args.data;
        return {
          id: 'exp-1',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          category: EXPENSE_CATEGORY.OPERATIONAL,
          amount: { toString: () => '150000' },
          description: 'Listrik',
          expenseDate: new Date('2026-06-06'),
          createdById: 'manager-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          outlet: { id: 'outlet-1', code: 'MAIN', name: 'Cabang Utama' },
          createdBy: { id: 'manager-1', fullName: 'Manager Demo' },
        };
      },
    },
  };

  const service = new ExpensesService(prisma as never);
  const result = await service.createExpense(createUser(), {
    outletId: 'outlet-1',
    category: ExpenseCategoryCode.OPERATIONAL,
    amount: 150000,
    description: 'Listrik',
    expenseDate: '2026-06-06',
  });

  assert.equal(result.amount, 150000);
  assert.ok(createdPayload);
  assert.equal(createdPayload.category, 'OPERATIONAL');
});

test('Expenses: updateExpense rejects unknown expense', async () => {
  const prisma = {
    expense: {
      findFirst: async () => null,
    },
  };
  const service = new ExpensesService(prisma as never);
  await assert.rejects(
    () =>
      service.updateExpense(createUser(), 'missing-id', {
        amount: 10000,
      }),
    (error: unknown) => error instanceof NotFoundException,
  );
});

test('Expenses: createExpense does not touch inventory or stock movements', async () => {
  let inventoryTouched = false;
  const prisma = {
    outlet: { findFirst: async () => ({ id: 'outlet-1' }) },
    expense: {
      create: async (args: { data: Record<string, unknown> }) => ({
        id: 'exp-2',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        category: EXPENSE_CATEGORY.OPERATIONAL,
        amount: { toString: () => String(args.data.amount) },
        description: 'Listrik',
        expenseDate: new Date('2026-06-06'),
        createdById: 'manager-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        outlet: { id: 'outlet-1', code: 'MAIN', name: 'Cabang Utama' },
        createdBy: { id: 'manager-1', fullName: 'Manager Demo' },
      }),
    },
    inventoryItem: {
      findMany: async () => {
        inventoryTouched = true;
        return [];
      },
      update: async () => {
        inventoryTouched = true;
      },
    },
    stockMovement: {
      create: async () => {
        inventoryTouched = true;
      },
    },
  };

  const service = new ExpensesService(prisma as never);
  await service.createExpense(createUser(), {
    outletId: 'outlet-1',
    category: ExpenseCategoryCode.OPERATIONAL,
    amount: 75_000,
    description: 'Air',
    expenseDate: '2026-06-06',
  });

  assert.equal(inventoryTouched, false);
});

test('Expenses: getTodaySummary aggregates by category', async () => {
  const prisma = {
    expense: {
      findMany: async () => [
        { amount: { toString: () => '50000' }, category: EXPENSE_CATEGORY.SHIPPING },
        { amount: { toString: () => '75000' }, category: EXPENSE_CATEGORY.LOADING_UNLOADING },
      ],
    },
  };
  const service = new ExpensesService(prisma as never);
  const summary = await service.getTodaySummary(createUser(), { outletId: 'outlet-1' });
  assert.equal(summary.total, 125000);
  assert.equal(summary.count, 2);
  assert.equal(summary.byCategory.SHIPPING, 50000);
});
