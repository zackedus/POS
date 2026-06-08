import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import { PaymentMethod, type FinanceSummary } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { toIdrInteger } from '../../common/utils/money.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { resolveReportDayRange } from '../../common/utils/report-date.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { computeOutstanding } from './finance.util';
import type { FinanceSummaryQueryDto } from './dto/finance.dto';

@Injectable()
export class FinanceSummaryService {
  private readonly logger = new Logger(FinanceSummaryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthJwtPayload, query: FinanceSummaryQueryDto): Promise<FinanceSummary> {
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : null;
    const range = resolveReportDayRange(query.date, undefined, undefined);
    const tenantId = user.tenantId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const receivableWhere: Prisma.ReceivableWhereInput = {
      tenantId,
      status: { in: ['OPEN', 'PARTIAL'] },
      ...(outletId ? { outletId } : {}),
    };

    const [receivableRows, payableRows, depositAgg, overdueRows, cashPayments] = await Promise.all([
      this.prisma.receivable.findMany({
        where: receivableWhere,
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.payable.findMany({
        where: {
          tenantId,
          status: { in: ['OPEN', 'PARTIAL'] },
          ...(outletId
            ? {
                OR: [{ purchaseOrder: { outletId } }, { poId: null }],
              }
            : {}),
        },
        select: { amount: true, paidAmount: true },
      }),
      this.prisma.customerDeposit.aggregate({
        where: { tenantId, status: 'ACTIVE' },
        _sum: { balance: true },
      }),
      this.prisma.receivable.findMany({
        where: {
          ...receivableWhere,
          dueDate: { lt: today },
        },
        select: { amount: true, paidAmount: true },
      }),
      outletId
        ? this.prisma.payment.groupBy({
            by: ['method'],
            where: {
              method: PaymentMethod.CASH,
              transaction: {
                outletId,
                outlet: { tenantId },
                status: 'COMPLETED',
                createdAt: { gte: range.startUtc, lt: range.endUtc },
              },
            },
            _sum: { amount: true },
          })
        : Promise.resolve([]),
    ]);

    const sumOutstanding = (rows: Array<{ amount: { toString(): string }; paidAmount: { toString(): string } }>) =>
      rows.reduce(
        (sum, row) => sum + computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount)),
        0,
      );

    const receivableOutstanding = sumOutstanding(receivableRows);
    const payableOutstanding = sumOutstanding(payableRows);
    const depositBalance = toIdrInteger(depositAgg._sum.balance);
    const overdueReceivableAmount = sumOutstanding(overdueRows);
    const cashToday =
      cashPayments.length > 0 ? toIdrInteger(cashPayments[0]?._sum.amount) : 0;

    return {
      receivableOutstanding,
      payableOutstanding,
      depositBalance,
      cashToday,
      overdueReceivableCount: overdueRows.length,
      overdueReceivableAmount,
      date: range.date,
      outletId,
    };
  }

  /** MVP email reminder stub — logs to console; WA deferred to Fase 3. */
  async sendOverdueReminderStub(user: AuthJwtPayload, outletId?: string): Promise<{ queued: number; message: string }> {
    const resolvedOutletId = outletId ? resolveOutletId(user, outletId) : undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = await this.prisma.receivable.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['OPEN', 'PARTIAL'] },
        dueDate: { lt: today },
        ...(resolvedOutletId ? { outletId: resolvedOutletId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    for (const row of overdue) {
      const outstanding = computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
      this.logger.log(
        `[FINANCE_REMINDER_STUB] tenant=${user.tenantId} customer=${row.customer.name} (${row.customer.phone}) outstanding=${outstanding} due=${row.dueDate?.toISOString().slice(0, 10) ?? '—'}`,
      );
    }

    return {
      queued: overdue.length,
      message:
        overdue.length > 0
          ? `${overdue.length} pengingat piutang jatuh tempo dicatat (stub email — integrasi SMTP/WA ditunda).`
          : 'Tidak ada piutang jatuh tempo untuk diingatkan.',
    };
  }
}
