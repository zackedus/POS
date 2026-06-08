import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ErrorCodes,
  PaymentMethod,
  type CashFlowFinanceReport,
  type DailySummaryFinanceReport,
  type FinanceReportMeta,
  type FinanceReportPeriod,
  type PayablesFinanceReport,
  type ProfitLossReport,
  type ReceivablesFinanceReport,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { toIdrInteger } from '../../common/utils/money.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { resolveFinanceReportRange, resolveReportDayRange } from '../../common/utils/report-date.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import {
  AGING_BUCKET_ORDER,
  computeAgingBucket,
  computeDaysOverdue,
  computeOutstanding,
  emptyAgingTotals,
} from '../finance/finance.util';
import type { DailySummaryQueryDto, FinanceReportQueryDto } from './dto/finance-report-query.dto';

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.QRIS,
  PaymentMethod.E_WALLET,
  PaymentMethod.CARD,
  PaymentMethod.CREDIT,
  PaymentMethod.DEPOSIT,
];

@Injectable()
export class FinanceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfitLoss(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<ProfitLossReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);

    const completedWhere = this.completedTransactionWhere(outletId, user.tenantId, range.startUtc, range.endUtc);

    const [salesAgg, voidRefundAgg, items, expenseAgg, expenseGroups] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: completedWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: this.adjustmentWhere(outletId, user.tenantId, range.startUtc, range.endUtc),
        _sum: { amount: true },
      }),
      this.prisma.transactionItem.findMany({
        where: { transaction: completedWhere },
        select: {
          quantity: true,
          product: { select: { costPrice: true } },
        },
      }),
      this.prisma.expense.aggregate({
        where: this.expenseWhere(outletId, user.tenantId, range),
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: this.expenseWhere(outletId, user.tenantId, range),
        _sum: { amount: true },
      }),
    ]);

    const grossSales = toIdrInteger(salesAgg._sum?.total);
    const voidRefund = toIdrInteger(voidRefundAgg._sum?.amount);
    const netSales = Math.max(0, grossSales - voidRefund);

    let cogs = 0;
    for (const item of items) {
      const qty = Number(item.quantity);
      const unitCost = toIdrInteger(item.product.costPrice);
      cogs += Math.round(unitCost * qty);
    }

    const grossProfit = netSales - cogs;
    const operatingExpenses = toIdrInteger(expenseAgg._sum?.amount);
    const netProfit = grossProfit - operatingExpenses;

    const expensesByCategory = expenseGroups
      .map((row) => ({
        category: row.category,
        amount: toIdrInteger(row._sum.amount),
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    return {
      meta,
      revenue: {
        grossSales,
        voidRefund,
        netSales,
        transactionCount: salesAgg._count?._all ?? 0,
      },
      cogs,
      grossProfit,
      grossMarginPercent: netSales > 0 ? Math.round((grossProfit / netSales) * 1000) / 10 : 0,
      operatingExpenses,
      expensesByCategory,
      netProfit,
      netMarginPercent: netSales > 0 ? Math.round((netProfit / netSales) * 1000) / 10 : 0,
    };
  }

  async getReceivables(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<ReceivablesFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);
    const today = this.startOfTodayJakarta();

    const baseWhere = this.receivableWhere(outletId, user.tenantId);

    const [openRows, newRows, paymentAgg, overdueRows] = await Promise.all([
      this.prisma.receivable.findMany({
        where: { ...baseWhere, status: { in: ['OPEN', 'PARTIAL'] } },
        select: { amount: true, paidAmount: true, dueDate: true },
      }),
      this.prisma.receivable.findMany({
        where: {
          ...baseWhere,
          status: { not: 'VOID' },
          createdAt: { gte: range.startUtc, lt: range.endUtc },
        },
        select: { amount: true },
      }),
      this.prisma.receivablePayment.aggregate({
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          receivable: baseWhere,
        },
        _sum: { amount: true },
      }),
      this.prisma.receivable.findMany({
        where: {
          ...baseWhere,
          status: { in: ['OPEN', 'PARTIAL'] },
          dueDate: { lt: today },
        },
        select: { amount: true, paidAmount: true, dueDate: true },
      }),
    ]);

    const aging = emptyAgingTotals();
    let outstanding = 0;
    for (const row of openRows) {
      const amount = computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
      outstanding += amount;
      const daysOverdue = computeDaysOverdue(row.dueDate, today);
      const bucket = computeAgingBucket(daysOverdue);
      aging[bucket].count += 1;
      aging[bucket].amount += amount;
    }

    let overdueAmount = 0;
    for (const row of overdueRows) {
      overdueAmount += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    const newInPeriod = newRows.reduce((sum, row) => sum + toIdrInteger(row.amount), 0);

    return {
      meta,
      summary: {
        outstanding,
        newInPeriod,
        collectionsInPeriod: toIdrInteger(paymentAgg._sum?.amount),
        overdueCount: overdueRows.length,
        overdueAmount,
      },
      aging,
    };
  }

  async getPayables(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<PayablesFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);
    const today = this.startOfTodayJakarta();

    const baseWhere = this.payableWhere(outletId, user.tenantId);

    const [openRows, newRows, paymentAgg, overdueRows] = await Promise.all([
      this.prisma.payable.findMany({
        where: { ...baseWhere, status: { in: ['OPEN', 'PARTIAL'] } },
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.payable.findMany({
        where: {
          ...baseWhere,
          status: { not: 'VOID' },
          createdAt: { gte: range.startUtc, lt: range.endUtc },
        },
        select: { amount: true },
      }),
      this.prisma.payablePayment.aggregate({
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          payable: baseWhere,
        },
        _sum: { amount: true },
      }),
      this.prisma.payable.findMany({
        where: {
          ...baseWhere,
          status: { in: ['OPEN', 'PARTIAL'] },
          dueDate: { lt: today },
        },
        select: { amount: true, paidAmount: true },
      }),
    ]);

    let outstanding = 0;
    for (const row of openRows) {
      outstanding += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    let overdueAmount = 0;
    for (const row of overdueRows) {
      overdueAmount += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    const newInPeriod = newRows.reduce((sum, row) => sum + toIdrInteger(row.amount), 0);

    return {
      meta,
      summary: {
        outstanding,
        newInPeriod,
        paymentsInPeriod: toIdrInteger(paymentAgg._sum?.amount),
        overdueCount: overdueRows.length,
        overdueAmount,
      },
    };
  }

  async getCashFlow(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<CashFlowFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);

    const completedWhere = this.completedTransactionWhere(outletId, user.tenantId, range.startUtc, range.endUtc);
    const receivableWhere = this.receivableWhere(outletId, user.tenantId);
    const payableWhere = this.payableWhere(outletId, user.tenantId);

    const [cashSalesAgg, receivablePaymentAgg, payablePaymentAgg, expenseAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          method: PaymentMethod.CASH,
          transaction: completedWhere,
        },
        _sum: { amount: true },
      }),
      this.prisma.receivablePayment.aggregate({
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          receivable: receivableWhere,
        },
        _sum: { amount: true },
      }),
      this.prisma.payablePayment.aggregate({
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          payable: payableWhere,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: this.expenseWhere(outletId, user.tenantId, range),
        _sum: { amount: true },
      }),
    ]);

    const cashSales = toIdrInteger(cashSalesAgg._sum?.amount);
    const receivableCollections = toIdrInteger(receivablePaymentAgg._sum?.amount);
    const payablePayments = toIdrInteger(payablePaymentAgg._sum?.amount);
    const operatingExpenses = toIdrInteger(expenseAgg._sum?.amount);

    const cashInTotal = cashSales + receivableCollections;
    const cashOutTotal = payablePayments + operatingExpenses;

    return {
      meta,
      cashIn: {
        cashSales,
        receivableCollections,
        total: cashInTotal,
      },
      cashOut: {
        payablePayments,
        operatingExpenses,
        total: cashOutTotal,
      },
      netCashFlow: cashInTotal - cashOutTotal,
    };
  }

  async getDailySummary(user: AuthJwtPayload, query: DailySummaryQueryDto): Promise<DailySummaryFinanceReport> {
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : null;
    if (outletId) {
      await this.ensureOutletExists(user.tenantId, outletId);
    }

    const range = resolveReportDayRange(query.date, undefined, undefined);
    const meta = this.buildMeta(outletId, range, 'day', query.date);

    const completedWhere = this.completedTransactionWhere(outletId, user.tenantId, range.startUtc, range.endUtc);
    const receivableWhere = this.receivableWhere(outletId, user.tenantId);
    const payableWhere = this.payableWhere(outletId, user.tenantId);

    const [salesAgg, voidRefundAgg, paymentGroups, newReceivables, newPayables] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: completedWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: this.adjustmentWhere(outletId, user.tenantId, range.startUtc, range.endUtc),
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { transaction: completedWhere },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.receivable.findMany({
        where: {
          ...receivableWhere,
          status: { not: 'VOID' },
          createdAt: { gte: range.startUtc, lt: range.endUtc },
        },
        select: { amount: true },
      }),
      this.prisma.payable.findMany({
        where: {
          ...payableWhere,
          status: { not: 'VOID' },
          createdAt: { gte: range.startUtc, lt: range.endUtc },
        },
        select: { amount: true },
      }),
    ]);

    const gross = toIdrInteger(salesAgg._sum?.total);
    const voidRefundTotal = toIdrInteger(voidRefundAgg._sum?.amount);
    const paymentMix = this.buildPaymentMix(paymentGroups, gross);

    return {
      meta,
      omzet: {
        gross,
        net: Math.max(0, gross - voidRefundTotal),
        transactionCount: salesAgg._count?._all ?? 0,
        voidRefundTotal,
      },
      paymentMix,
      newReceivables: {
        count: newReceivables.length,
        amount: newReceivables.reduce((sum, row) => sum + toIdrInteger(row.amount), 0),
      },
      newPayables: {
        count: newPayables.length,
        amount: newPayables.reduce((sum, row) => sum + toIdrInteger(row.amount), 0),
      },
    };
  }

  private async resolveContext(user: AuthJwtPayload, query: FinanceReportQueryDto) {
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : null;
    if (outletId) {
      await this.ensureOutletExists(user.tenantId, outletId);
    }

    const hasCustom = Boolean(query.from?.trim() || query.to?.trim());
    const range = resolveFinanceReportRange({
      period: query.period,
      date: query.date,
      from: query.from,
      to: query.to,
    });

    const periodLabel: FinanceReportPeriod | 'custom' = hasCustom
      ? 'custom'
      : (query.period ?? 'month');

    return {
      outletId,
      range,
      meta: this.buildMeta(outletId, range, periodLabel, query.date),
    };
  }

  private buildMeta(
    outletId: string | null,
    range: ReturnType<typeof resolveFinanceReportRange>,
    period: FinanceReportPeriod | 'custom',
    anchorDate?: string,
  ): FinanceReportMeta {
    return {
      outletId,
      period,
      date: anchorDate?.trim() || range.dateFrom || range.date,
      dateFrom: range.dateFrom ?? range.date,
      dateTo: range.dateTo ?? range.date,
      isRange: range.isRange,
      timezone: 'Asia/Jakarta',
      generatedAt: new Date().toISOString(),
    };
  }

  private completedTransactionWhere(
    outletId: string | null,
    tenantId: string,
    startUtc: Date,
    endUtc: Date,
  ): Prisma.TransactionWhereInput {
    return {
      status: 'COMPLETED',
      completedAt: { gte: startUtc, lt: endUtc },
      outlet: { tenantId },
      ...(outletId ? { outletId } : {}),
    };
  }

  private adjustmentWhere(
    outletId: string | null,
    tenantId: string,
    startUtc: Date,
    endUtc: Date,
  ): Prisma.TransactionAdjustmentWhereInput {
    return {
      createdAt: { gte: startUtc, lt: endUtc },
      transaction: {
        outlet: { tenantId },
        ...(outletId ? { outletId } : {}),
      },
    };
  }

  private expenseWhere(
    outletId: string | null,
    tenantId: string,
    range: ReturnType<typeof resolveFinanceReportRange>,
  ): Prisma.ExpenseWhereInput {
    const dateFrom = range.dateFrom ?? range.date;
    const dateTo = range.dateTo ?? range.date;
    return {
      tenantId,
      expenseDate: {
        gte: new Date(`${dateFrom}T00:00:00.000Z`),
        lte: new Date(`${dateTo}T00:00:00.000Z`),
      },
      ...(outletId ? { outletId } : {}),
    };
  }

  private receivableWhere(outletId: string | null, tenantId: string): Prisma.ReceivableWhereInput {
    return {
      tenantId,
      ...(outletId ? { outletId } : {}),
    };
  }

  private payableWhere(outletId: string | null, tenantId: string): Prisma.PayableWhereInput {
    return {
      tenantId,
      ...(outletId
        ? {
            OR: [{ purchaseOrder: { outletId } }, { poId: null }],
          }
        : {}),
    };
  }

  private buildPaymentMix(
    paymentGroups: Array<{
      method: string;
      _sum: { amount?: Parameters<typeof toIdrInteger>[0] | null };
      _count: { id: number };
    }>,
    grossOmzet: number,
  ) {
    const byMethod = new Map(
      paymentGroups.map((row) => [
        row.method,
        { amount: toIdrInteger(row._sum?.amount), count: row._count.id },
      ]),
    );

    return PAYMENT_METHOD_ORDER.map((method) => {
      const row = byMethod.get(method) ?? { amount: 0, count: 0 };
      const sharePercent = grossOmzet > 0 ? Math.round((row.amount / grossOmzet) * 1000) / 10 : 0;
      return { method, amount: row.amount, count: row.count, sharePercent };
    }).filter((row) => row.amount > 0 || row.count > 0);
  }

  private startOfTodayJakarta(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  private async ensureOutletExists(tenantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId },
      select: { id: true },
    });
    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Outlet tidak ditemukan.',
      });
    }
  }
}

/** Re-export for tests — aging bucket order validation. */
export { AGING_BUCKET_ORDER };
