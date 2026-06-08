import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ErrorCodes,
  PaymentMethod,
  RECEIVABLE_AGING_BUCKET_LABELS,
  type CashFlowFinanceReport,
  type DailySummaryFinanceReport,
  type FinanceReportBreakdown,
  type FinanceReportBreakdownRow,
  type FinanceReportBreakdownSection,
  type FinanceReportMeta,
  type FinanceReportPeriod,
  type PayablesFinanceReport,
  type ProfitLossReport,
  type ReceivableAgingBucket,
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

    const [salesAgg, voidRefundAgg, items, expenseAgg, expenseGroups, paymentGroups] = await Promise.all([
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
          productName: true,
          subtotal: true,
          product: {
            select: {
              costPrice: true,
              category: { select: { name: true } },
            },
          },
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
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { transaction: completedWhere },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const grossSales = toIdrInteger(salesAgg._sum?.total);
    const voidRefund = toIdrInteger(voidRefundAgg._sum?.amount);
    const netSales = Math.max(0, grossSales - voidRefund);

    const cogsByCategory = new Map<string, { quantity: number; amount: number }>();
    const cogsByProduct = new Map<string, { quantity: number; amount: number }>();
    let cogs = 0;
    for (const item of items) {
      const qty = Number(item.quantity);
      const unitCost = toIdrInteger(item.product.costPrice);
      const lineCogs = Math.round(unitCost * qty);
      cogs += lineCogs;

      const categoryName = item.product.category?.name ?? 'Tanpa Kategori';
      const categoryRow = cogsByCategory.get(categoryName) ?? { quantity: 0, amount: 0 };
      categoryRow.quantity += qty;
      categoryRow.amount += lineCogs;
      cogsByCategory.set(categoryName, categoryRow);

      const productRow = cogsByProduct.get(item.productName) ?? { quantity: 0, amount: 0 };
      productRow.quantity += qty;
      productRow.amount += lineCogs;
      cogsByProduct.set(item.productName, productRow);
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

    const salesByMethod = this.buildPaymentMix(paymentGroups, grossSales);
    const breakdown = this.buildProfitLossBreakdown({
      grossSales,
      netSales,
      cogs,
      operatingExpenses,
      salesByMethod,
      cogsByCategory,
      cogsByProduct,
      expensesByCategory,
    });

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
      breakdown,
    };
  }

  async getReceivables(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<ReceivablesFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);
    const today = this.startOfTodayJakarta();

    const baseWhere = this.receivableWhere(outletId, user.tenantId);

    const [openRows, newRows, paymentAgg, overdueRows] = await Promise.all([
      this.prisma.receivable.findMany({
        where: { ...baseWhere, status: { in: ['OPEN', 'PARTIAL'] } },
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          dueDate: true,
          customer: { select: { name: true } },
          transaction: { select: { receiptNo: true } },
        },
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
    const agingRows = new Map<ReceivableAgingBucket, FinanceReportBreakdownRow[]>();
    for (const bucket of AGING_BUCKET_ORDER) {
      agingRows.set(bucket, []);
    }

    let outstanding = 0;
    for (const row of openRows) {
      const amount = computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
      outstanding += amount;
      const daysOverdue = computeDaysOverdue(row.dueDate, today);
      const bucket = computeAgingBucket(daysOverdue);
      aging[bucket].count += 1;
      aging[bucket].amount += amount;

      agingRows.get(bucket)?.push({
        label: row.customer.name,
        referenceNo: row.transaction?.receiptNo ?? row.id.slice(0, 8),
        amount,
        dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
      });
    }

    let overdueAmount = 0;
    for (const row of overdueRows) {
      overdueAmount += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    const newInPeriod = newRows.reduce((sum, row) => sum + toIdrInteger(row.amount), 0);
    const breakdown = this.buildReceivablesBreakdown(aging, agingRows);

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
      breakdown,
    };
  }

  async getPayables(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<PayablesFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);
    const today = this.startOfTodayJakarta();

    const baseWhere = this.payableWhere(outletId, user.tenantId);

    const [openRows, newRows, paymentAgg, overdueRows] = await Promise.all([
      this.prisma.payable.findMany({
        where: { ...baseWhere, status: { in: ['OPEN', 'PARTIAL'] } },
        select: {
          id: true,
          amount: true,
          paidAmount: true,
          status: true,
          dueDate: true,
          supplier: { select: { name: true } },
          purchaseOrder: { select: { orderNo: true } },
        },
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
    const payableRows: FinanceReportBreakdownRow[] = [];
    const statusTotals = { OPEN: 0, PARTIAL: 0, OVERDUE: 0 };

    for (const row of openRows) {
      const amount = computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
      outstanding += amount;

      const isOverdue = row.dueDate != null && row.dueDate < today;
      const displayStatus =
        row.status === 'PARTIAL' ? 'Sebagian' : isOverdue ? 'Jatuh Tempo' : 'Terbuka';

      if (row.status === 'PARTIAL') {
        statusTotals.PARTIAL += amount;
      } else {
        statusTotals.OPEN += amount;
      }
      if (isOverdue) {
        statusTotals.OVERDUE += amount;
      }

      payableRows.push({
        label: row.supplier.name,
        referenceNo: row.purchaseOrder?.orderNo ?? row.id.slice(0, 8),
        amount,
        dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
        status: displayStatus,
      });
    }

    let overdueAmount = 0;
    for (const row of overdueRows) {
      overdueAmount += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    const newInPeriod = newRows.reduce((sum, row) => sum + toIdrInteger(row.amount), 0);
    const breakdown = this.buildPayablesBreakdown(payableRows, statusTotals);

    return {
      meta,
      summary: {
        outstanding,
        newInPeriod,
        paymentsInPeriod: toIdrInteger(paymentAgg._sum?.amount),
        overdueCount: overdueRows.length,
        overdueAmount,
      },
      breakdown,
    };
  }

  async getCashFlow(user: AuthJwtPayload, query: FinanceReportQueryDto): Promise<CashFlowFinanceReport> {
    const { outletId, range, meta } = await this.resolveContext(user, query);

    const completedWhere = this.completedTransactionWhere(outletId, user.tenantId, range.startUtc, range.endUtc);
    const receivableWhere = this.receivableWhere(outletId, user.tenantId);
    const payableWhere = this.payableWhere(outletId, user.tenantId);

    const [
      cashSalesAgg,
      receivablePaymentAgg,
      payablePaymentAgg,
      expenseAgg,
      receivablePaymentGroups,
      expenseGroups,
      depositTopUpAgg,
      refundAgg,
    ] = await Promise.all([
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
      this.prisma.receivablePayment.groupBy({
        by: ['method'],
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          receivable: receivableWhere,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.expense.groupBy({
        by: ['category'],
        where: this.expenseWhere(outletId, user.tenantId, range),
        _sum: { amount: true },
      }),
      this.prisma.depositTransaction.aggregate({
        where: {
          type: 'TOP_UP',
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          deposit: { tenantId: user.tenantId },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: this.adjustmentWhere(outletId, user.tenantId, range.startUtc, range.endUtc),
        _sum: { amount: true },
      }),
    ]);

    const cashSales = toIdrInteger(cashSalesAgg._sum?.amount);
    const receivableCollections = toIdrInteger(receivablePaymentAgg._sum?.amount);
    const payablePayments = toIdrInteger(payablePaymentAgg._sum?.amount);
    const operatingExpenses = toIdrInteger(expenseAgg._sum?.amount);

    const depositTopUps = toIdrInteger(depositTopUpAgg._sum?.amount);
    const refunds = toIdrInteger(refundAgg._sum?.amount);
    const cashInTotal = cashSales + receivableCollections + depositTopUps;
    const cashOutTotal = payablePayments + operatingExpenses + refunds;

    const expenseByCategory = expenseGroups
      .map((row) => ({
        category: row.category,
        amount: toIdrInteger(row._sum.amount),
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const breakdown = this.buildCashFlowBreakdown({
      cashSales,
      receivableCollections,
      depositTopUps,
      depositTopUpCount: depositTopUpAgg._count?.id ?? 0,
      receivablePaymentGroups,
      payablePayments,
      operatingExpenses,
      expenseByCategory,
      refunds,
      cashInTotal,
      cashOutTotal,
    });

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
      breakdown,
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

    const expenseWhere = this.expenseWhere(outletId, user.tenantId, range);

    const [salesAgg, voidRefundAgg, paymentGroups, newReceivables, newPayables, topProductGroups, dayExpenses, shifts] =
      await Promise.all([
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
        this.prisma.transactionItem.groupBy({
          by: ['productName'],
          where: { transaction: completedWhere },
          _sum: { quantity: true, subtotal: true },
          _count: { id: true },
        }),
        this.prisma.expense.findMany({
          where: expenseWhere,
          select: {
            category: true,
            amount: true,
            description: true,
            expenseDate: true,
          },
          orderBy: { expenseDate: 'asc' },
        }),
        this.prisma.shift.findMany({
          where: {
            openedAt: { gte: range.startUtc, lt: range.endUtc },
            outlet: {
              tenantId: user.tenantId,
              ...(outletId ? { id: outletId } : {}),
            },
          },
          orderBy: { openedAt: 'asc' },
          include: {
            cashier: { select: { fullName: true } },
            transactions: {
              where: { status: 'COMPLETED' },
              select: { total: true },
            },
          },
        }),
      ]);

    const gross = toIdrInteger(salesAgg._sum?.total);
    const voidRefundTotal = toIdrInteger(voidRefundAgg._sum?.amount);
    const paymentMix = this.buildPaymentMix(paymentGroups, gross);

    const breakdown = this.buildDailySummaryBreakdown({
      paymentMix,
      topProductGroups,
      shifts,
      dayExpenses,
    });

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
      breakdown,
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

  private pct(amount: number, total: number): number {
    return total > 0 ? Math.round((amount / total) * 1000) / 10 : 0;
  }

  private buildProfitLossBreakdown(input: {
    grossSales: number;
    netSales: number;
    cogs: number;
    operatingExpenses: number;
    salesByMethod: Array<{ method: string; amount: number; count: number; sharePercent: number }>;
    cogsByCategory: Map<string, { quantity: number; amount: number }>;
    cogsByProduct: Map<string, { quantity: number; amount: number }>;
    expensesByCategory: Array<{ category: string; amount: number }>;
  }): FinanceReportBreakdown {
    const salesRows: FinanceReportBreakdownRow[] = input.salesByMethod.map((row) => ({
      label: row.method,
      count: row.count,
      amount: row.amount,
      percentage: row.sharePercent,
    }));

    const cogsCategoryRows = [...input.cogsByCategory.entries()]
      .map(([label, data]) => ({
        label,
        quantity: Math.round(data.quantity * 1000) / 1000,
        amount: data.amount,
        percentage: this.pct(data.amount, input.cogs),
      }))
      .sort((a, b) => b.amount - a.amount);

    const cogsProductRows = [...input.cogsByProduct.entries()]
      .map(([label, data]) => ({
        label,
        quantity: Math.round(data.quantity * 1000) / 1000,
        amount: data.amount,
        percentage: this.pct(data.amount, input.cogs),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const expenseRows: FinanceReportBreakdownRow[] = input.expensesByCategory.map((row) => ({
      label: row.category,
      amount: row.amount,
      percentage: this.pct(row.amount, input.operatingExpenses),
    }));

    const sections: FinanceReportBreakdownSection[] = [
      {
        title: 'Rincian Penjualan per Metode Bayar',
        rows: salesRows,
        subtotal: input.grossSales,
        emptyMessage: 'Tidak ada data pada periode ini',
      },
      {
        title: 'Rincian HPP per Kategori Produk',
        rows: cogsCategoryRows,
        subtotal: input.cogs,
        emptyMessage: 'Tidak ada data pada periode ini',
      },
      {
        title: 'Top 10 Produk (HPP)',
        rows: cogsProductRows,
        subtotal: cogsProductRows.reduce((sum, row) => sum + row.amount, 0),
        emptyMessage: 'Tidak ada data pada periode ini',
      },
      {
        title: 'Rincian Beban Operasional',
        rows: expenseRows,
        subtotal: input.operatingExpenses,
        emptyMessage: 'Tidak ada data pada periode ini',
      },
    ];

    return { sections };
  }

  private buildReceivablesBreakdown(
    aging: Record<ReceivableAgingBucket, { count: number; amount: number }>,
    agingRows: Map<ReceivableAgingBucket, FinanceReportBreakdownRow[]>,
  ): FinanceReportBreakdown {
    const sections: FinanceReportBreakdownSection[] = AGING_BUCKET_ORDER.map((bucket) => ({
      title: `${RECEIVABLE_AGING_BUCKET_LABELS[bucket]} (${aging[bucket].count} faktur)`,
      rows: agingRows.get(bucket) ?? [],
      subtotal: aging[bucket].amount,
      emptyMessage: 'Tidak ada piutang pada bucket ini',
    }));

    return { sections };
  }

  private buildPayablesBreakdown(
    payableRows: FinanceReportBreakdownRow[],
    statusTotals: { OPEN: number; PARTIAL: number; OVERDUE: number },
  ): FinanceReportBreakdown {
    const sortedRows = [...payableRows].sort((a, b) => b.amount - a.amount);

    return {
      sections: [
        {
          title: 'Daftar Utang Supplier',
          rows: sortedRows,
          subtotal: sortedRows.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada utang outstanding pada periode ini',
        },
        {
          title: 'Ringkasan per Status',
          rows: [
            { label: 'Terbuka (OPEN)', amount: statusTotals.OPEN },
            { label: 'Sebagian (PARTIAL)', amount: statusTotals.PARTIAL },
            { label: 'Jatuh Tempo (OVERDUE)', amount: statusTotals.OVERDUE },
          ].filter((row) => row.amount > 0),
          subtotal: sortedRows.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada data pada periode ini',
        },
      ],
    };
  }

  private buildCashFlowBreakdown(input: {
    cashSales: number;
    receivableCollections: number;
    depositTopUps: number;
    depositTopUpCount: number;
    receivablePaymentGroups: Array<{
      method: string;
      _sum: { amount?: Parameters<typeof toIdrInteger>[0] | null };
      _count: { id: number };
    }>;
    payablePayments: number;
    operatingExpenses: number;
    expenseByCategory: Array<{ category: string; amount: number }>;
    refunds: number;
    cashInTotal: number;
    cashOutTotal: number;
  }): FinanceReportBreakdown {
    const collectionRows = input.receivablePaymentGroups
      .map((row) => ({
        label: row.method,
        count: row._count.id,
        amount: toIdrInteger(row._sum?.amount),
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const inflowRows: FinanceReportBreakdownRow[] = [
      { label: 'Penjualan tunai', amount: input.cashSales, percentage: this.pct(input.cashSales, input.cashInTotal) },
      {
        label: 'Pelunasan piutang',
        amount: input.receivableCollections,
        percentage: this.pct(input.receivableCollections, input.cashInTotal),
      },
      {
        label: 'Top-up deposit pelanggan',
        count: input.depositTopUpCount,
        amount: input.depositTopUps,
        percentage: this.pct(input.depositTopUps, input.cashInTotal),
      },
    ].filter((row) => row.amount > 0);

    const expenseRows: FinanceReportBreakdownRow[] = input.expenseByCategory.map((row) => ({
      label: row.category,
      amount: row.amount,
      percentage: this.pct(row.amount, input.operatingExpenses),
    }));

    const outflowRows: FinanceReportBreakdownRow[] = [
      {
        label: 'Bayar utang supplier',
        amount: input.payablePayments,
        percentage: this.pct(input.payablePayments, input.cashOutTotal),
      },
      {
        label: 'Pengeluaran operasional',
        amount: input.operatingExpenses,
        percentage: this.pct(input.operatingExpenses, input.cashOutTotal),
      },
      {
        label: 'Refund / void',
        amount: input.refunds,
        percentage: this.pct(input.refunds, input.cashOutTotal),
      },
    ].filter((row) => row.amount > 0);

    return {
      sections: [
        {
          title: 'Rincian Kas Masuk',
          rows: inflowRows,
          subtotal: input.cashInTotal,
          emptyMessage: 'Tidak ada data pada periode ini',
        },
        {
          title: 'Rincian Pelunasan Piutang per Metode',
          rows: collectionRows,
          subtotal: input.receivableCollections,
          emptyMessage: 'Tidak ada pelunasan piutang pada periode ini',
        },
        {
          title: 'Rincian Kas Keluar — Pengeluaran per Kategori',
          rows: expenseRows,
          subtotal: input.operatingExpenses,
          emptyMessage: 'Tidak ada pengeluaran pada periode ini',
        },
        {
          title: 'Rincian Kas Keluar',
          rows: outflowRows,
          subtotal: input.cashOutTotal,
          emptyMessage: 'Tidak ada data pada periode ini',
        },
      ],
    };
  }

  private buildDailySummaryBreakdown(input: {
    paymentMix: Array<{ method: string; amount: number; count: number; sharePercent: number }>;
    topProductGroups: Array<{
      productName: string;
      _sum: { quantity?: Parameters<typeof toIdrInteger>[0] | null; subtotal?: Parameters<typeof toIdrInteger>[0] | null };
      _count: { id: number };
    }>;
    shifts: Array<{
      cashier: { fullName: string };
      openedAt: Date;
      closedAt: Date | null;
      transactions: Array<{ total: Parameters<typeof toIdrInteger>[0] }>;
    }>;
    dayExpenses: Array<{
      category: string;
      amount: Parameters<typeof toIdrInteger>[0];
      description: string | null;
      expenseDate: Date;
    }>;
  }): FinanceReportBreakdown {
    const paymentRows: FinanceReportBreakdownRow[] = input.paymentMix.map((row) => ({
      label: row.method,
      count: row.count,
      amount: row.amount,
      percentage: row.sharePercent,
    }));

    const topProducts = [...input.topProductGroups]
      .map((row) => ({
        label: row.productName,
        quantity: Number(row._sum.quantity ?? 0),
        count: row._count.id,
        amount: toIdrInteger(row._sum.subtotal),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    const shiftRows: FinanceReportBreakdownRow[] = input.shifts.map((shift) => {
      const grossOmzet = shift.transactions.reduce((sum, tx) => sum + toIdrInteger(tx.total), 0);
      return {
        label: shift.cashier.fullName,
        subLabel: shift.closedAt ? 'Tutup' : 'Masih buka',
        count: shift.transactions.length,
        amount: grossOmzet,
      };
    });

    const expenseRows: FinanceReportBreakdownRow[] = input.dayExpenses.map((row) => ({
      label: row.category,
      subLabel: row.description ?? undefined,
      amount: toIdrInteger(row.amount),
    }));

    return {
      sections: [
        {
          title: 'Transaksi per Metode Bayar',
          rows: paymentRows,
          subtotal: paymentRows.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada transaksi pada hari ini',
        },
        {
          title: 'Top 10 Produk Terjual',
          rows: topProducts,
          subtotal: topProducts.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada penjualan produk pada hari ini',
        },
        {
          title: 'Ringkasan Shift',
          rows: shiftRows,
          subtotal: shiftRows.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada shift pada hari ini',
        },
        {
          title: 'Pengeluaran Hari Ini',
          rows: expenseRows,
          subtotal: expenseRows.reduce((sum, row) => sum + row.amount, 0),
          emptyMessage: 'Tidak ada pengeluaran pada hari ini',
        },
      ],
    };
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
