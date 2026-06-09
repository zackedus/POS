import { Injectable, NotFoundException } from '@nestjs/common';
import { PayableStatus, ReceivableStatus, type Prisma } from '@prisma/client';
import {
  ErrorCodes,
  PaymentMethod,
  type AnalyticsChangeDirection,
  type AnalyticsKpiMetric,
  type AnalyticsPeriod,
  type AnalyticsSummary,
  type FinanceReportPeriod,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { buildAnalyticsMarginCsv } from '../../common/utils/analytics-export.util';
import { buildDailySalesCsv, buildDailySalesPdf } from '../../common/utils/daily-export.util';
import {
  resolveFinanceReportRange,
  resolvePreviousPeriodRange,
  resolveReportDayRange,
  type ReportDayRange,
} from '../../common/utils/report-date.util';
import { toIdrInteger } from '../../common/utils/money.util';
import { canAccessAnyTenantOutlet, resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { DailyExportQueryDto } from './dto/daily-export-query.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { AnalyticsQueryDto, AnalyticsPeriodDays } from './dto/analytics-query.dto';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import { computeOutstanding } from '../finance/finance.util';
import { ScheduledAnalyticsExportQueryDto } from './dto/scheduled-analytics-export-query.dto';
import { resolveCurrentWeekRangeJakarta } from '../../common/utils/report-date.util';

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.QRIS,
  PaymentMethod.E_WALLET,
  PaymentMethod.CARD,
  PaymentMethod.CREDIT,
  PaymentMethod.DEPOSIT,
];

type PaymentMixRow = {
  method: PaymentMethod;
  amount: number;
  count: number;
  sharePercent: number;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailySales(user: AuthJwtPayload, query: ReportsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const range = resolveReportDayRange(query.date, query.dateFrom, query.dateTo);

    const completedWhere = this.completedTransactionWhere(outletId, user.tenantId, range.startUtc, range.endUtc);

    const [salesAgg, paymentGroups, voidRefundAgg] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: completedWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { transaction: completedWhere },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: {
          createdAt: { gte: range.startUtc, lt: range.endUtc },
          transaction: { outletId, outlet: { tenantId: user.tenantId } },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const grossOmzet = toIdrInteger(salesAgg._sum?.total);
    const voidRefundTotal = toIdrInteger(voidRefundAgg._sum?.amount);
    const paymentMix = this.buildPaymentMix(paymentGroups, grossOmzet);

    return {
      outletId,
      date: range.date,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      isRange: range.isRange,
      timezone: 'Asia/Jakarta',
      transactionCount: salesAgg._count?._all ?? 0,
      grossOmzet,
      voidRefundCount: voidRefundAgg._count?._all ?? 0,
      voidRefundTotal,
      netOmzet: Math.max(0, grossOmzet - voidRefundTotal),
      paymentMix,
    };
  }

  async getPaymentMix(user: AuthJwtPayload, query: ReportsQueryDto) {
    const daily = await this.getDailySales(user, query);
    return {
      outletId: daily.outletId,
      date: daily.date,
      timezone: daily.timezone,
      grossOmzet: daily.grossOmzet,
      paymentMix: daily.paymentMix,
    };
  }

  async getDashboard(user: AuthJwtPayload, query: ReportsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const range = resolveReportDayRange(query.date, query.dateFrom, query.dateTo);

    const [daily, activeShifts, shiftSummaries] = await Promise.all([
      this.getDailySales(user, { ...query, outletId }),
      this.prisma.shift.count({
        where: { outletId, closedAt: null, outlet: { tenantId: user.tenantId } },
      }),
      this.buildShiftSummaries(outletId, user.tenantId, range.startUtc, range.endUtc),
    ]);

    return {
      outletId,
      date: range.date,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      isRange: range.isRange,
      timezone: 'Asia/Jakarta',
      pulse: {
        transactionCount: daily.transactionCount,
        grossOmzet: daily.grossOmzet,
        netOmzet: daily.netOmzet,
        voidRefundCount: daily.voidRefundCount,
        voidRefundTotal: daily.voidRefundTotal,
        paymentMix: daily.paymentMix,
      },
      operations: {
        activeShifts,
        shiftsClosedToday: shiftSummaries.filter((s) => s.closedAt != null).length,
      },
      shiftSummaries,
    };
  }

  async getShiftSummaries(user: AuthJwtPayload, query: ReportsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const range = resolveReportDayRange(query.date, query.dateFrom, query.dateTo);
    const shiftSummaries = await this.buildShiftSummaries(outletId, user.tenantId, range.startUtc, range.endUtc);

    return {
      outletId,
      date: range.date,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
      isRange: range.isRange,
      timezone: 'Asia/Jakarta',
      shifts: shiftSummaries,
    };
  }

  async listOutlets(user: AuthJwtPayload) {
    const where: Prisma.OutletWhereInput = canAccessAnyTenantOutlet(user)
      ? { tenantId: user.tenantId, isActive: true }
      : {
          tenantId: user.tenantId,
          isActive: true,
          id: { in: user.outletIds },
        };

    const outlets = await this.prisma.outlet.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, code: true, address: true, isActive: true, isDefault: true },
    });

    const defaultFromFlag = outlets.find((o) => o.isDefault)?.id ?? null;

    return {
      outlets,
      requiresOutletSelection: outlets.length > 1,
      defaultOutletId: defaultFromFlag ?? (outlets.length === 1 ? (outlets[0]?.id ?? null) : null),
    };
  }

  async getStockSummary(user: AuthJwtPayload, query: StockReportQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);

    const rows = await this.prisma.inventoryItem.findMany({
      where: {
        outletId,
        outlet: { tenantId: user.tenantId },
        product: { isActive: true, hasVariants: false },
      },
      select: {
        quantity: true,
        minStock: true,
        product: {
          select: {
            sku: true,
            name: true,
            variantLabel: true,
            costPrice: true,
            parentProduct: { select: { name: true } },
          },
        },
      },
    });

    let lowStockCount = 0;
    let totalQuantity = 0;
    let stockValue = 0;
    const lowStockItems: Array<{
      sku: string;
      displayName: string;
      quantity: number;
      minStock: number;
    }> = [];

    for (const row of rows) {
      const quantity = Number(row.quantity);
      const minStock = Number(row.minStock);
      totalQuantity += quantity;

      const variantLabel = row.product.variantLabel;
      const parentName = row.product.parentProduct?.name ?? null;
      const displayName =
        variantLabel && parentName
          ? `${parentName} — ${variantLabel}`
          : variantLabel
            ? `${row.product.name} (${variantLabel})`
            : row.product.name;

      if (quantity <= minStock) {
        lowStockCount += 1;
        lowStockItems.push({ sku: row.product.sku, displayName, quantity, minStock });
      }

      if (row.product.costPrice != null) {
        stockValue += quantity * toIdrInteger(row.product.costPrice);
      }
    }

    lowStockItems.sort((a, b) => a.quantity - b.quantity);

    return {
      outletId,
      totalSkus: rows.length,
      totalQuantity,
      lowStockCount,
      stockValue,
      hasCostData: stockValue > 0,
      topLowStock: lowStockItems.slice(0, 5),
      allLowStock: lowStockItems,
    };
  }

  async exportLowStockCsv(user: AuthJwtPayload, query: StockReportQueryDto) {
    const summary = await this.getStockSummary(user, query);
    const header = 'sku,name,quantity,min_stock,deficit';
    const lines = (summary.allLowStock ?? []).map((item) => {
      const deficit = Math.max(0, item.minStock - item.quantity);
      const escapedName = `"${item.displayName.replace(/"/g, '""')}"`;
      return `${item.sku},${escapedName},${item.quantity},${item.minStock},${deficit}`;
    });
    const body = `\uFEFF${header}\n${lines.join('\n')}\n`;
    const date = new Date().toISOString().slice(0, 10);
    return {
      filename: `low-stock-${date}.csv`,
      body,
    };
  }

  async getCrossOutletStock(user: AuthJwtPayload, query: { outletId?: string; productId?: string }) {
    const currentOutletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, currentOutletId);

    const outlets = await this.prisma.outlet.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(canAccessAnyTenantOutlet(user)
          ? { id: { not: currentOutletId } }
          : { id: { in: user.outletIds.filter((id) => id !== currentOutletId) } }),
      },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });

    if (outlets.length === 0) {
      return {
        currentOutletId,
        outlets: [],
        products: [],
      };
    }

    const outletIds = outlets.map((o) => o.id);
    const inventoryRows = await this.prisma.inventoryItem.findMany({
      where: {
        outletId: { in: outletIds },
        ...(query.productId ? { productId: query.productId } : {}),
        product: { tenantId: user.tenantId, isActive: true },
      },
      select: {
        outletId: true,
        quantity: true,
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            variantLabel: true,
            parentProduct: { select: { name: true } },
            unit: { select: { symbol: true } },
          },
        },
      },
      orderBy: [{ product: { name: 'asc' } }, { outletId: 'asc' }],
      take: query.productId ? outletIds.length : 200,
    });

    type ProductAgg = {
      productId: string;
      sku: string;
      displayName: string;
      unitSymbol: string | null;
      byOutlet: Array<{ outletId: string; outletName: string; outletCode: string; quantity: number }>;
    };

    const outletMap = new Map(outlets.map((o) => [o.id, o]));
    const productMap = new Map<string, ProductAgg>();

    for (const row of inventoryRows) {
      const outlet = outletMap.get(row.outletId);
      if (!outlet) continue;

      const variantLabel = row.product.variantLabel;
      const parentName = row.product.parentProduct?.name ?? null;
      const displayName =
        variantLabel && parentName
          ? `${parentName} — ${variantLabel}`
          : variantLabel
            ? `${row.product.name} (${variantLabel})`
            : row.product.name;

      const agg =
        productMap.get(row.product.id) ??
        ({
          productId: row.product.id,
          sku: row.product.sku,
          displayName,
          unitSymbol: row.product.unit?.symbol ?? null,
          byOutlet: [],
        } satisfies ProductAgg);

      agg.byOutlet.push({
        outletId: outlet.id,
        outletName: outlet.name,
        outletCode: outlet.code,
        quantity: Number(row.quantity),
      });
      productMap.set(row.product.id, agg);
    }

    const products = [...productMap.values()]
      .filter((p) => p.byOutlet.some((o) => o.quantity > 0))
      .slice(0, query.productId ? 1 : 20);

    return {
      currentOutletId,
      outlets: outlets.map((o) => ({ id: o.id, name: o.name, code: o.code })),
      products,
    };
  }

  async getAnalyticsSummary(user: AuthJwtPayload, query: AnalyticsSummaryQueryDto): Promise<AnalyticsSummary> {
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : null;
    if (outletId) {
      await this.ensureOutletExists(user.tenantId, outletId);
    }

    const hasCustom = Boolean(query.from?.trim() || query.to?.trim());
    const range = resolveFinanceReportRange({
      period: query.period ?? 'day',
      date: query.date,
      from: query.from,
      to: query.to,
    });

    const anchor = query.date?.trim() || range.dateFrom || range.date;
    const period: AnalyticsPeriod | 'custom' = hasCustom ? 'custom' : (query.period ?? 'day');
    const previousRange =
      period === 'custom'
        ? this.deriveCustomPreviousRange(range)
        : resolvePreviousPeriodRange(period as FinanceReportPeriod, anchor);

    const tenantId = user.tenantId;
    const completedWhere = this.scopedCompletedTransactionWhere(
      outletId,
      tenantId,
      range.startUtc,
      range.endUtc,
    );
    const previousWhere = this.scopedCompletedTransactionWhere(
      outletId,
      tenantId,
      previousRange.startUtc,
      previousRange.endUtc,
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const receivableWhere: Prisma.ReceivableWhereInput = {
      tenantId,
      status: { in: [ReceivableStatus.OPEN, ReceivableStatus.PARTIAL] },
      ...(outletId ? { outletId } : {}),
    };
    const payableWhere: Prisma.PayableWhereInput = {
      tenantId,
      status: { in: [PayableStatus.OPEN, PayableStatus.PARTIAL] },
      ...(outletId
        ? { OR: [{ purchaseOrder: { outletId } }, { poId: null }] }
        : {}),
    };

    const [
      salesAgg,
      previousSalesAgg,
      voidRefundAgg,
      previousVoidRefundAgg,
      paymentGroups,
      items,
      transactions,
      previousItems,
      receivableRows,
      overdueReceivableRows,
      payableRows,
      overduePayableRows,
      outletGroups,
      outlets,
    ] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: completedWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.transaction.aggregate({
        where: previousWhere,
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: this.scopedAdjustmentWhere(outletId, tenantId, range.startUtc, range.endUtc),
        _sum: { amount: true },
      }),
      this.prisma.transactionAdjustment.aggregate({
        where: this.scopedAdjustmentWhere(
          outletId,
          tenantId,
          previousRange.startUtc,
          previousRange.endUtc,
        ),
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { transaction: completedWhere },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.transactionItem.findMany({
        where: { transaction: completedWhere },
        select: {
          productId: true,
          productName: true,
          quantity: true,
          subtotal: true,
          product: {
            select: {
              costPrice: true,
              category: { select: { id: true, name: true } },
            },
          },
          transaction: {
            select: {
              completedAt: true,
              outletId: true,
              outlet: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.transaction.findMany({
        where: completedWhere,
        select: { completedAt: true, total: true },
      }),
      this.prisma.transactionItem.findMany({
        where: { transaction: previousWhere },
        select: {
          subtotal: true,
          quantity: true,
          product: { select: { costPrice: true } },
        },
      }),
      this.prisma.receivable.findMany({
        where: receivableWhere,
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.receivable.findMany({
        where: { ...receivableWhere, dueDate: { lt: today } },
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.payable.findMany({
        where: payableWhere,
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.payable.findMany({
        where: { ...payableWhere, dueDate: { lt: today } },
        select: { amount: true, paidAmount: true },
      }),
      outletId
        ? Promise.resolve([])
        : this.prisma.transaction.groupBy({
            by: ['outletId'],
            where: completedWhere,
            _sum: { total: true },
            _count: { _all: true },
          }),
      outletId
        ? Promise.resolve([])
        : this.prisma.outlet.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, name: true },
          }),
    ]);

    const grossOmzet = toIdrInteger(salesAgg._sum?.total);
    const previousGrossOmzet = toIdrInteger(previousSalesAgg._sum?.total);
    const voidRefundTotal = toIdrInteger(voidRefundAgg._sum?.amount);
    const previousVoidRefundTotal = toIdrInteger(previousVoidRefundAgg._sum?.amount);
    const netSales = Math.max(0, grossOmzet - voidRefundTotal);
    const previousNetSales = Math.max(0, previousGrossOmzet - previousVoidRefundTotal);
    const transactionCount = salesAgg._count?._all ?? 0;
    const previousTransactionCount = previousSalesAgg._count?._all ?? 0;

    let totalCost = 0;
    type CategoryAgg = {
      categoryId: string;
      categoryName: string;
      revenue: number;
      margin: number;
      quantity: number;
    };
    const categoryMap = new Map<string, CategoryAgg>();
    const productMap = new Map<
      string,
      { productId: string; productName: string; revenue: number; quantity: number }
    >();
    const trendMap = new Map<string, { label: string; date?: string; revenue: number; transactionCount: number }>();
    const outletPerfMap = new Map<
      string,
      { outletId: string; outletName: string; revenue: number; transactionCount: number; grossProfit: number }
    >();

    for (const item of items) {
      const qty = Number(item.quantity);
      const revenue = toIdrInteger(item.subtotal);
      const unitCost = toIdrInteger(item.product.costPrice);
      const cost = Math.round(unitCost * qty);
      const margin = revenue - cost;
      totalCost += cost;

      const catId = item.product.category?.id ?? 'uncategorized';
      const catName = item.product.category?.name ?? 'Tanpa Kategori';
      const catRow = categoryMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        revenue: 0,
        margin: 0,
        quantity: 0,
      };
      catRow.revenue += revenue;
      catRow.margin += margin;
      catRow.quantity += qty;
      categoryMap.set(catId, catRow);

      const prodRow = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        revenue: 0,
        quantity: 0,
      };
      prodRow.revenue += revenue;
      prodRow.quantity += qty;
      productMap.set(item.productId, prodRow);

      const completedAt = item.transaction.completedAt;
      if (completedAt) {
        const bucket = this.resolveTrendBucket(completedAt, period, range);
        const trendRow = trendMap.get(bucket.key) ?? {
          label: bucket.label,
          date: bucket.date,
          revenue: 0,
          transactionCount: 0,
        };
        trendRow.revenue += revenue;
        trendMap.set(bucket.key, trendRow);
      }

    for (const tx of transactions) {
      if (!tx.completedAt) continue;
      const bucket = this.resolveTrendBucket(tx.completedAt, period, range);
      const trendRow = trendMap.get(bucket.key) ?? {
        label: bucket.label,
        date: bucket.date,
        revenue: 0,
        transactionCount: 0,
      };
      trendRow.transactionCount += 1;
      trendMap.set(bucket.key, trendRow);
    }

      if (!outletId) {
        const oId = item.transaction.outletId;
        const oName = item.transaction.outlet?.name ?? oId;
        const outletRow = outletPerfMap.get(oId) ?? {
          outletId: oId,
          outletName: oName,
          revenue: 0,
          transactionCount: 0,
          grossProfit: 0,
        };
        outletRow.revenue += revenue;
        outletRow.grossProfit += margin;
        outletPerfMap.set(oId, outletRow);
      }
    }

    for (const group of outletGroups) {
      const oId = group.outletId;
      const outletRow = outletPerfMap.get(oId) ?? {
        outletId: oId,
        outletName: outlets.find((o) => o.id === oId)?.name ?? oId,
        revenue: 0,
        transactionCount: 0,
        grossProfit: 0,
      };
      outletRow.transactionCount = group._count?._all ?? 0;
      outletPerfMap.set(oId, outletRow);
    }

    const grossProfit = netSales - totalCost;
    const grossProfitPercent = netSales > 0 ? Math.round((grossProfit / netSales) * 1000) / 10 : 0;

    const marginByCategory = [...categoryMap.values()]
      .map((row) => ({
        ...row,
        marginPercent: row.revenue > 0 ? Math.round((row.margin / row.revenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    const salesTrend = this.buildFilledSalesTrend(period, range, trendMap);
    const paymentMethods = this.buildPaymentMix(paymentGroups, grossOmzet);

    let receivablesOutstanding = 0;
    for (const row of receivableRows) {
      receivablesOutstanding += computeOutstanding(
        toIdrInteger(row.amount),
        toIdrInteger(row.paidAmount),
      );
    }
    let payablesOutstanding = 0;
    for (const row of payableRows) {
      payablesOutstanding += computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
    }

    let previousTotalCost = 0;
    for (const item of previousItems) {
      const qty = Number(item.quantity);
      const unitCost = toIdrInteger(item.product.costPrice);
      previousTotalCost += Math.round(unitCost * qty);
    }
    const previousGrossProfit = Math.max(0, previousNetSales - previousTotalCost);

    const outletPerformance =
      outletId === null && outletGroups.length > 0
        ? [...outletPerfMap.values()].sort((a, b) => b.revenue - a.revenue)
        : null;

    const pulse = {
      netSales: this.buildKpiMetric(netSales, previousNetSales),
      transactionCount: this.buildKpiMetric(transactionCount, previousTransactionCount),
      averageTicket: this.buildKpiMetric(
        transactionCount > 0 ? Math.round(netSales / transactionCount) : 0,
        previousTransactionCount > 0
          ? Math.round(previousNetSales / previousTransactionCount)
          : 0,
      ),
      grossProfit: this.buildKpiMetric(grossProfit, previousGrossProfit),
      grossProfitPercent,
    };

    const insights = this.buildAnalyticsInsights({
      period,
      pulse,
      topProducts,
      paymentMethods,
      financeSnapshot: {
        receivablesOutstanding,
        receivablesOverdueCount: overdueReceivableRows.length,
        payablesOutstanding,
        payablesOverdueCount: overduePayableRows.length,
      },
    });

    return {
      outletId,
      period,
      dateFrom: range.dateFrom ?? range.date,
      dateTo: range.dateTo ?? range.date,
      previousDateFrom: previousRange.dateFrom ?? previousRange.date,
      previousDateTo: previousRange.dateTo ?? previousRange.date,
      timezone: 'Asia/Jakarta',
      pulse,
      salesTrend,
      topProducts,
      paymentMethods,
      outletPerformance,
      financeSnapshot: {
        receivablesOutstanding,
        receivablesOverdueCount: overdueReceivableRows.length,
        payablesOutstanding,
        payablesOverdueCount: overduePayableRows.length,
      },
      marginByCategory,
      insights,
    };
  }

  async getAnalytics(user: AuthJwtPayload, query: AnalyticsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const days = query.days ?? AnalyticsPeriodDays.DAYS_7;
    const endUtc = new Date();
    const startUtc = new Date(endUtc);
    startUtc.setUTCDate(startUtc.getUTCDate() - days);
    return this.buildAnalyticsReport(user.tenantId, outletId, startUtc, endUtc, days);
  }

  /** Public wrapper for scheduled email export (no auth context). */
  async buildAnalyticsReportPublic(
    tenantId: string,
    outletId: string,
    startUtc: Date,
    endUtc: Date,
    periodDays: AnalyticsPeriodDays | number,
    dateFromOverride?: string,
    dateToOverride?: string,
  ) {
    return this.buildAnalyticsReport(
      tenantId,
      outletId,
      startUtc,
      endUtc,
      periodDays,
      dateFromOverride,
      dateToOverride,
    );
  }

  private async buildAnalyticsReport(
    tenantId: string,
    outletId: string,
    startUtc: Date,
    endUtc: Date,
    periodDays: AnalyticsPeriodDays | number,
    dateFromOverride?: string,
    dateToOverride?: string,
  ) {
    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          outletId,
          status: 'COMPLETED',
          completedAt: { gte: startUtc, lt: endUtc },
          outlet: { tenantId },
        },
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        product: {
          select: {
            costPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
        transaction: { select: { completedAt: true } },
      },
    });

    type CategoryAgg = {
      categoryId: string;
      categoryName: string;
      revenue: number;
      cost: number;
      margin: number;
      quantity: number;
    };
    const categoryMap = new Map<string, CategoryAgg>();
    type ProductAgg = { productId: string; productName: string; revenue: number; quantity: number };
    const productMap = new Map<string, ProductAgg>();
    const trendMap = new Map<string, { date: string; revenue: number; transactionItems: number }>();

    for (const item of items) {
      const qty = Number(item.quantity);
      const revenue = toIdrInteger(item.subtotal);
      const unitCost = toIdrInteger(item.product.costPrice);
      const cost = Math.round(unitCost * qty);
      const margin = revenue - cost;

      const catId = item.product.category?.id ?? 'uncategorized';
      const catName = item.product.category?.name ?? 'Tanpa Kategori';
      const catRow = categoryMap.get(catId) ?? {
        categoryId: catId,
        categoryName: catName,
        revenue: 0,
        cost: 0,
        margin: 0,
        quantity: 0,
      };
      catRow.revenue += revenue;
      catRow.cost += cost;
      catRow.margin += margin;
      catRow.quantity += qty;
      categoryMap.set(catId, catRow);

      const prodRow = productMap.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        revenue: 0,
        quantity: 0,
      };
      prodRow.revenue += revenue;
      prodRow.quantity += qty;
      productMap.set(item.productId, prodRow);

      const completedAt = item.transaction.completedAt;
      if (completedAt) {
        const dateKey = completedAt.toISOString().slice(0, 10);
        const trendRow = trendMap.get(dateKey) ?? { date: dateKey, revenue: 0, transactionItems: 0 };
        trendRow.revenue += revenue;
        trendRow.transactionItems += 1;
        trendMap.set(dateKey, trendRow);
      }
    }

    const marginByCategory = [...categoryMap.values()]
      .map((row) => ({
        ...row,
        marginPercent: row.revenue > 0 ? Math.round((row.margin / row.revenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const topProducts = [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const salesTrend = [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const totals = marginByCategory.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        cost: acc.cost + row.cost,
        margin: acc.margin + row.margin,
      }),
      { revenue: 0, cost: 0, margin: 0 },
    );

    return {
      outletId,
      periodDays,
      dateFrom: dateFromOverride ?? startUtc.toISOString().slice(0, 10),
      dateTo: dateToOverride ?? endUtc.toISOString().slice(0, 10),
      timezone: 'Asia/Jakarta',
      summary: {
        revenue: totals.revenue,
        cost: totals.cost,
        margin: totals.margin,
        marginPercent:
          totals.revenue > 0 ? Math.round((totals.margin / totals.revenue) * 1000) / 10 : 0,
        itemCount: items.length,
      },
      marginByCategory,
      topProducts,
      salesTrend,
    };
  }

  async exportAnalyticsMargin(user: AuthJwtPayload, query: AnalyticsQueryDto) {
    const report = await this.getAnalytics(user, query);
    const filename = `analitik-margin-${report.periodDays}hari-${report.dateFrom}_${report.dateTo}-${report.outletId}.csv`;
    return {
      format: 'csv' as const,
      filename,
      body: `\uFEFF${buildAnalyticsMarginCsv(report)}`,
    };
  }

  async exportAnalyticsScheduled(user: AuthJwtPayload, query: ScheduledAnalyticsExportQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const weekRange = resolveCurrentWeekRangeJakarta();
    const report = await this.buildAnalyticsReport(
      user.tenantId,
      outletId,
      weekRange.startUtc,
      weekRange.endUtc,
      7,
      weekRange.dateFrom,
      weekRange.dateTo,
    );
    const filename = `analitik-minggu-ini-${weekRange.dateFrom}_${weekRange.dateTo}-${outletId}.csv`;
    return {
      format: 'csv' as const,
      filename,
      preset: query.preset ?? 'week',
      dateFrom: weekRange.dateFrom ?? weekRange.date,
      dateTo: weekRange.dateTo ?? weekRange.date,
      body: `\uFEFF${buildAnalyticsMarginCsv(report)}`,
    };
  }

  async exportDailySales(user: AuthJwtPayload, query: DailyExportQueryDto) {
    const daily = await this.getDailySales(user, query);
    const exportedAt = new Date().toISOString();
    const format = query.format ?? 'json';

    if (format === 'csv') {
      return {
        format: 'csv' as const,
        filename: `laporan-${daily.isRange ? 'rentang' : 'harian'}-${daily.date.replace(/\s+/g, '_')}-${daily.outletId}.csv`,
        body: `\uFEFF${buildDailySalesCsv(daily)}`,
      };
    }

    if (format === 'pdf') {
      const pdfBody = buildDailySalesPdf(daily);
      return {
        format: 'pdf' as const,
        filename: `laporan-${daily.isRange ? 'rentang' : 'harian'}-${daily.date.replace(/\s+/g, '_')}-${daily.outletId}.pdf`,
        body: pdfBody,
      };
    }

    return {
      format: 'json' as const,
      exportedAt,
      report: daily,
    };
  }

  private scopedCompletedTransactionWhere(
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

  private scopedAdjustmentWhere(
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

  private deriveCustomPreviousRange(range: ReportDayRange): ReportDayRange {
    const from = range.dateFrom ?? range.date;
    const to = range.dateTo ?? range.date;
    const start = this.dayStartUtc(from);
    const end = this.dayStartUtc(to);
    const spanMs = end.getTime() - start.getTime() + 24 * 60 * 60 * 1000;
    const prevEnd = new Date(start.getTime());
    const prevStart = new Date(start.getTime() - spanMs);
    const prevFrom = new Date(prevStart.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const prevTo = new Date(prevEnd.getTime() - 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return resolveReportDayRange(undefined, prevFrom, prevTo);
  }

  private buildKpiMetric(current: number, previous: number): AnalyticsKpiMetric {
    let changePercent: number | null = null;
    let direction: AnalyticsChangeDirection = 'flat';

    if (previous > 0) {
      changePercent = Math.round(((current - previous) / previous) * 1000) / 10;
      direction = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';
    } else if (current > 0) {
      changePercent = 100;
      direction = 'up';
    }

    return { current, previous, changePercent, direction };
  }

  private resolveTrendBucket(
    completedAt: Date,
    period: AnalyticsPeriod | 'custom',
    _range: ReportDayRange,
  ): { key: string; label: string; date?: string } {
    const jakarta = new Date(completedAt.getTime() + 7 * 60 * 60 * 1000);
    const isoDate = jakarta.toISOString().slice(0, 10);

    if (period === 'day') {
      const hour = jakarta.getUTCHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      return { key: `h-${hour}`, label, date: isoDate };
    }

    if (period === 'year') {
      const month = isoDate.slice(0, 7);
      const monthLabel = new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${month}-15T12:00:00Z`));
      return { key: `m-${month}`, label: monthLabel, date: month };
    }

    const dayLabel = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${isoDate}T12:00:00Z`));
    return { key: `d-${isoDate}`, label: dayLabel, date: isoDate };
  }

  private buildFilledSalesTrend(
    period: AnalyticsPeriod | 'custom',
    range: ReportDayRange,
    trendMap: Map<string, { label: string; date?: string; revenue: number; transactionCount: number }>,
  ) {
    const from = range.dateFrom ?? range.date;
    const to = range.dateTo ?? range.date;

    if (period === 'day') {
      return Array.from({ length: 24 }, (_, hour) => {
        const key = `h-${hour}`;
        const row = trendMap.get(key);
        return {
          label: `${String(hour).padStart(2, '0')}:00`,
          date: from,
          revenue: row?.revenue ?? 0,
          transactionCount: row?.transactionCount ?? 0,
        };
      });
    }

    if (period === 'year') {
      const year = from.slice(0, 4);
      return Array.from({ length: 12 }, (_, index) => {
        const month = `${year}-${String(index + 1).padStart(2, '0')}`;
        const key = `m-${month}`;
        const row = trendMap.get(key);
        const label = new Intl.DateTimeFormat('id-ID', {
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(`${month}-15T12:00:00Z`));
        return {
          label,
          date: month,
          revenue: row?.revenue ?? 0,
          transactionCount: row?.transactionCount ?? 0,
        };
      });
    }

    const points: Array<{ label: string; date?: string; revenue: number; transactionCount: number }> = [];
    let cursor = from;
    while (cursor <= to) {
      const key = `d-${cursor}`;
      const row = trendMap.get(key);
      const label = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${cursor}T12:00:00Z`));
      points.push({
        label,
        date: cursor,
        revenue: row?.revenue ?? 0,
        transactionCount: row?.transactionCount ?? 0,
      });
      const next = new Date(this.dayStartUtc(cursor).getTime() + 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      cursor = next;
    }
    return points;
  }

  private buildAnalyticsInsights(input: {
    period: AnalyticsPeriod | 'custom';
    pulse: AnalyticsSummary['pulse'];
    topProducts: AnalyticsSummary['topProducts'];
    paymentMethods: AnalyticsSummary['paymentMethods'];
    financeSnapshot: AnalyticsSummary['financeSnapshot'];
  }): string[] {
    const insights: string[] = [];
    const periodLabel =
      input.period === 'day'
        ? 'kemarin'
        : input.period === 'week'
          ? 'minggu lalu'
          : input.period === 'month'
            ? 'bulan lalu'
            : input.period === 'year'
              ? 'tahun lalu'
              : 'periode sebelumnya';

    const { netSales, transactionCount } = input.pulse;
    if (netSales.changePercent !== null && netSales.direction !== 'flat') {
      const verb = netSales.direction === 'up' ? 'naik' : 'turun';
      insights.push(
        `Penjualan bersih ${verb} ${Math.abs(netSales.changePercent)}% vs ${periodLabel}.`,
      );
    } else if (netSales.current === 0) {
      insights.push('Belum ada penjualan pada periode ini — cek shift kasir dan promosi.');
    }

    if (input.topProducts[0]) {
      const top = input.topProducts[0];
      insights.push(`Produk terlaris: ${top.productName} (${top.quantity} unit).`);
    }

    if (transactionCount.current > 0 && transactionCount.changePercent !== null) {
      if (transactionCount.direction === 'down' && transactionCount.changePercent <= -15) {
        insights.push(
          `Jumlah transaksi turun ${Math.abs(transactionCount.changePercent)}% — evaluasi jam sibuk dan staf kasir.`,
        );
      }
    }

    const cash = input.paymentMethods.find((row) => row.method === PaymentMethod.CASH);
    if (cash && cash.sharePercent >= 60) {
      insights.push(`Pembayaran tunai dominan (${cash.sharePercent}%) — pertimbangkan edukasi QRIS/transfer.`);
    }

    if (input.financeSnapshot.receivablesOverdueCount > 0) {
      insights.push(
        `${input.financeSnapshot.receivablesOverdueCount} piutang jatuh tempo — prioritaskan penagihan.`,
      );
    }

    return insights.slice(0, 3);
  }

  private dayStartUtc(isoDate: string): Date {
    return new Date(`${isoDate}T00:00:00+07:00`);
  }

  private completedTransactionWhere(
    outletId: string,
    tenantId: string,
    startUtc: Date,
    endUtc: Date,
  ): Prisma.TransactionWhereInput {
    return this.scopedCompletedTransactionWhere(outletId, tenantId, startUtc, endUtc);
  }

  private buildPaymentMix(
    paymentGroups: Array<{
      method: string;
      _sum: { amount?: Parameters<typeof toIdrInteger>[0] | null };
      _count: { id: number };
    }>,
    grossOmzet: number,
  ): PaymentMixRow[] {
    const byMethod = new Map(
      paymentGroups.map((row) => [
        row.method,
        {
          amount: toIdrInteger(row._sum?.amount),
          count: row._count.id,
        },
      ]),
    );

    return PAYMENT_METHOD_ORDER.map((method) => {
      const row = byMethod.get(method) ?? { amount: 0, count: 0 };
      const sharePercent =
        grossOmzet > 0 ? Math.round((row.amount / grossOmzet) * 1000) / 10 : 0;
      return {
        method,
        amount: row.amount,
        count: row.count,
        sharePercent,
      };
    }).filter((row) => row.amount > 0 || row.count > 0);
  }

  private async buildShiftSummaries(
    outletId: string,
    tenantId: string,
    startUtc: Date,
    endUtc: Date,
  ) {
    const shifts = await this.prisma.shift.findMany({
      where: {
        outletId,
        openedAt: { gte: startUtc, lt: endUtc },
        outlet: { tenantId },
      },
      orderBy: { openedAt: 'asc' },
      include: {
        cashier: { select: { id: true, fullName: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { total: true },
        },
      },
    });

    return shifts.map((shift) => {
      const transactionCount = shift.transactions.length;
      const grossOmzet = shift.transactions.reduce(
        (sum, tx) => sum + toIdrInteger(tx.total),
        0,
      );

      return {
        shiftId: shift.id,
        cashierId: shift.cashierId,
        cashierName: shift.cashier.fullName,
        openingCash: toIdrInteger(shift.openingCash),
        closingCash: shift.closingCash != null ? toIdrInteger(shift.closingCash) : null,
        expectedCash: shift.expectedCash != null ? toIdrInteger(shift.expectedCash) : null,
        difference: shift.difference != null ? toIdrInteger(shift.difference) : null,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
        transactionCount,
        grossOmzet,
        isOpen: shift.closedAt == null,
      };
    });
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
