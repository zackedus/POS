import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpenseCategory } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { buildPaginationMeta, resolvePagination } from '../../common/utils/pagination.util';
import { canAccessAnyTenantOutlet, resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import {
  CreateExpenseDto,
  ExpenseSummaryQueryDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async listExpenses(user: AuthJwtPayload, query: ListExpensesQueryDto) {
    const where = this.buildListWhere(user, query);
    const { page, limit, skip } = resolvePagination(query);
    const [rows, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        include: {
          outlet: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapExpense(row)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getTodaySummary(user: AuthJwtPayload, query: ExpenseSummaryQueryDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const listQuery: ListExpensesQueryDto = {
      outletId: query.outletId,
      dateFrom: today.toISOString().slice(0, 10),
      dateTo: today.toISOString().slice(0, 10),
    };
    const rows = await this.prisma.expense.findMany({
      where: this.buildListWhere(user, listQuery),
      select: { amount: true, category: true },
    });
    const byCategory: Record<'OPERATIONAL' | 'LOADING_UNLOADING' | 'SHIPPING' | 'OTHER', number> = {
      OPERATIONAL: 0,
      LOADING_UNLOADING: 0,
      SHIPPING: 0,
      OTHER: 0,
    };
    let total = 0;
    for (const row of rows) {
      const amount = toIdrInteger(row.amount);
      total += amount;
      byCategory[row.category] += amount;
    }
    return {
      date: listQuery.dateFrom,
      total,
      count: rows.length,
      byCategory,
    };
  }

  async createExpense(user: AuthJwtPayload, dto: CreateExpenseDto) {
    const outletId = dto.outletId ? resolveOutletId(user, dto.outletId) : null;
    if (dto.outletId) {
      await this.ensureOutletExists(user.tenantId, outletId!);
    }

    const expense = await this.prisma.expense.create({
      data: {
        tenantId: user.tenantId,
        outletId,
        category: dto.category,
        amount: idrToDecimal(dto.amount),
        description: dto.description?.trim() || null,
        expenseDate: new Date(`${dto.expenseDate.slice(0, 10)}T00:00:00.000Z`),
        createdById: user.sub,
      },
      include: {
        outlet: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    return this.mapExpense(expense);
  }

  async updateExpense(user: AuthJwtPayload, expenseId: string, dto: UpdateExpenseDto) {
    await this.ensureExpenseExists(user.tenantId, expenseId);

    let outletId: string | null | undefined;
    if (dto.outletId !== undefined) {
      if (dto.outletId === null) {
        outletId = null;
      } else {
        outletId = resolveOutletId(user, dto.outletId);
        await this.ensureOutletExists(user.tenantId, outletId);
      }
    }

    const expense = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.amount !== undefined ? { amount: idrToDecimal(dto.amount) } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.expenseDate !== undefined
          ? { expenseDate: new Date(`${dto.expenseDate.slice(0, 10)}T00:00:00.000Z`) }
          : {}),
        ...(outletId !== undefined ? { outletId } : {}),
      },
      include: {
        outlet: { select: { id: true, code: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });
    return this.mapExpense(expense);
  }

  private buildListWhere(user: AuthJwtPayload, query: ListExpensesQueryDto) {
    const where: {
      tenantId: string;
      outletId?: string | { in: string[] };
      category?: ExpenseCategory;
      expenseDate?: { gte?: Date; lte?: Date };
    } = { tenantId: user.tenantId };

    if (query.outletId) {
      const outletId = resolveOutletId(user, query.outletId);
      where.outletId = outletId;
    } else if (user.outletIds.length > 0 && !canAccessAnyTenantOutlet(user)) {
      where.outletId = { in: user.outletIds };
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.dateFrom || query.dateTo) {
      where.expenseDate = {};
      if (query.dateFrom) {
        where.expenseDate.gte = new Date(`${query.dateFrom.slice(0, 10)}T00:00:00.000Z`);
      }
      if (query.dateTo) {
        where.expenseDate.lte = new Date(`${query.dateTo.slice(0, 10)}T23:59:59.999Z`);
      }
    }

    return where;
  }

  private mapExpense(row: {
    id: string;
    tenantId: string;
    outletId: string | null;
    category: ExpenseCategory;
    amount: Decimal;
    description: string | null;
    expenseDate: Date;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    outlet: { id: string; code: string; name: string } | null;
    createdBy: { id: string; fullName: string };
  }) {
    return {
      id: row.id,
      tenantId: row.tenantId,
      outletId: row.outletId,
      category: row.category,
      amount: toIdrInteger(row.amount),
      description: row.description,
      expenseDate: row.expenseDate.toISOString().slice(0, 10),
      createdById: row.createdById,
      createdBy: row.createdBy,
      outlet: row.outlet,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async ensureExpenseExists(tenantId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, tenantId } });
    if (!expense) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pengeluaran tidak ditemukan.',
      });
    }
  }

  private async ensureOutletExists(tenantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({ where: { id: outletId, tenantId } });
    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Outlet tidak ditemukan.',
      });
    }
  }
}
