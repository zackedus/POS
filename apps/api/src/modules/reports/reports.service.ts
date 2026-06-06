import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import type { Prisma } from '@prisma/client';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { buildAnalyticsMarginCsv } from '../../common/utils/analytics-export.util';
import { buildDailySalesCsv, buildDailySalesPdf } from '../../common/utils/daily-export.util';
import { resolveReportDayRange } from '../../common/utils/report-date.util';
import { toIdrInteger } from '../../common/utils/money.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { DailyExportQueryDto } from './dto/daily-export-query.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { AnalyticsQueryDto, AnalyticsPeriodDays } from './dto/analytics-query.dto';

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.QRIS,
  PaymentMethod.E_WALLET,
  PaymentMethod.CARD,
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
    const where: Prisma.OutletWhereInput =
      user.role === UserRole.OWNER
        ? { tenantId: user.tenantId, isActive: true }
        : {
            tenantId: user.tenantId,
            isActive: true,
            id: { in: user.outletIds },
          };

    const outlets = await this.prisma.outlet.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, code: true, address: true, isActive: true },
    });

    return {
      outlets,
      requiresOutletSelection: outlets.length > 1,
      defaultOutletId: outlets.length === 1 ? outlets[0]?.id ?? null : null,
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
    };
  }

  async getCrossOutletStock(user: AuthJwtPayload, query: { outletId?: string; productId?: string }) {
    const currentOutletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, currentOutletId);

    const outlets = await this.prisma.outlet.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        ...(user.role !== UserRole.OWNER
          ? { id: { in: user.outletIds.filter((id) => id !== currentOutletId) } }
          : { id: { not: currentOutletId } }),
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

  async getAnalytics(user: AuthJwtPayload, query: AnalyticsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const days = query.days ?? AnalyticsPeriodDays.DAYS_7;
    const endUtc = new Date();
    const startUtc = new Date(endUtc);
    startUtc.setUTCDate(startUtc.getUTCDate() - days);

    const items = await this.prisma.transactionItem.findMany({
      where: {
        transaction: {
          outletId,
          status: 'COMPLETED',
          completedAt: { gte: startUtc, lt: endUtc },
          outlet: { tenantId: user.tenantId },
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
      periodDays: days,
      dateFrom: startUtc.toISOString().slice(0, 10),
      dateTo: endUtc.toISOString().slice(0, 10),
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

  private completedTransactionWhere(
    outletId: string,
    tenantId: string,
    startUtc: Date,
    endUtc: Date,
  ): Prisma.TransactionWhereInput {
    return {
      outletId,
      status: 'COMPLETED',
      completedAt: { gte: startUtc, lt: endUtc },
      outlet: { tenantId },
    };
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
