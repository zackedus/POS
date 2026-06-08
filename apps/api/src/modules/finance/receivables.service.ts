import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import { ErrorCodes, RECEIVABLE_AGING_BUCKET_LABELS, type ReceivableAgingReport } from '@barokah/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FinanceCheckoutService } from './finance-checkout.service';
import { CreditLimitService } from './credit-limit.service';
import { computeOutstanding, computeReceivableStatus, computeAgingBucket, computeDaysOverdue, emptyAgingTotals, AGING_BUCKET_ORDER } from './finance.util';
import type {
  AgingReportQueryDto,
  CreateReceivableDto,
  CustomerStatementQueryDto,
  ListReceivablesQueryDto,
  RecordReceivablePaymentDto,
  UpdateCustomerCreditLimitDto,
} from './dto/receivable.dto';

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeCheckout: FinanceCheckoutService,
    private readonly creditLimitService: CreditLimitService,
  ) {}

  async list(user: AuthJwtPayload, query: ListReceivablesQueryDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: Prisma.ReceivableWhereInput = { tenantId: user.tenantId };

    if (query.customerId) where.customerId = query.customerId;
    if (query.outletId) where.outletId = resolveOutletId(user, query.outletId);

    if (query.status === 'OVERDUE') {
      where.AND = [{ status: { in: ['OPEN', 'PARTIAL'] }, dueDate: { lt: today } }];
    } else if (query.status) {
      where.status = query.status;
    }

    const rows = await this.prisma.receivable.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, code: true, name: true } },
        transaction: { select: { id: true, receiptNo: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: { recordedBy: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => this.mapReceivable(row));
  }

  async getById(user: AuthJwtPayload, receivableId: string) {
    const row = await this.prisma.receivable.findFirst({
      where: { id: receivableId, tenantId: user.tenantId },
      include: {
        customer: { select: { id: true, name: true, phone: true, creditLimit: true } },
        outlet: { select: { id: true, code: true, name: true } },
        transaction: { select: { id: true, receiptNo: true, total: true, createdAt: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Piutang tidak ditemukan.',
      });
    }
    return this.mapReceivable(row, true);
  }

  async create(user: AuthJwtPayload, dto: CreateReceivableDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId: user.tenantId },
      select: { id: true, creditLimit: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    const outstanding = await this.financeCheckout.getCustomerOutstandingReceivableIdr(
      user.tenantId,
      dto.customerId,
    );
    const creditLimit = customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null;
    if (creditLimit === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_NOT_ALLOWED,
        message: 'Pelanggan tidak diizinkan transaksi tempo.',
      });
    }
    if (creditLimit != null && outstanding + dto.amount > creditLimit) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_LIMIT_EXCEEDED,
        message: 'Limit kredit pelanggan terlampaui.',
      });
    }

    const outletId = dto.outletId ? resolveOutletId(user, dto.outletId) : null;
    const row = await this.prisma.receivable.create({
      data: {
        tenantId: user.tenantId,
        customerId: dto.customerId,
        outletId,
        amount: idrToDecimal(dto.amount),
        paidAmount: idrToDecimal(0),
        status: 'OPEN',
        dueDate: dto.dueDate ? new Date(`${dto.dueDate.slice(0, 10)}T00:00:00.000Z`) : null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, code: true, name: true } },
      },
    });
    return this.mapReceivable(row);
  }

  async recordPayment(user: AuthJwtPayload, receivableId: string, dto: RecordReceivablePaymentDto) {
    const receivable = await this.prisma.receivable.findFirst({
      where: { id: receivableId, tenantId: user.tenantId },
      select: { id: true, customerId: true },
    });
    if (!receivable) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Piutang tidak ditemukan.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.financeCheckout.recordReceivablePayment(tx, {
        receivableId,
        amountIdr: dto.amount,
        method: dto.method,
        reference: dto.reference,
        recordedById: user.sub,
      });
    });

    await this.creditLimitService.recalculateAutoLimit(user.tenantId, receivable.customerId);

    return this.getById(user, receivableId);
  }

  async listOverdue(user: AuthJwtPayload, query: ListReceivablesQueryDto = {}) {
    return this.list(user, { ...query, status: 'OVERDUE' });
  }

  async getAgingReport(user: AuthJwtPayload, query: AgingReportQueryDto): Promise<ReceivableAgingReport> {
    const asOf = new Date();
    asOf.setHours(0, 0, 0, 0);
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : null;
    const groupByCustomer = query.groupByCustomer === true;

    const rows = await this.prisma.receivable.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['OPEN', 'PARTIAL'] },
        ...(outletId ? { outletId } : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    const totalsMap = emptyAgingTotals();
    const agingRows: ReceivableAgingReport['rows'] = [];
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        customerPhone: string;
        buckets: ReturnType<typeof emptyAgingTotals>;
        totalOutstanding: number;
      }
    >();

    for (const row of rows) {
      const outstanding = computeOutstanding(toIdrInteger(row.amount), toIdrInteger(row.paidAmount));
      if (outstanding <= 0) continue;

      const daysOverdue = computeDaysOverdue(row.dueDate, asOf);
      const bucket = computeAgingBucket(daysOverdue);

      totalsMap[bucket].count += 1;
      totalsMap[bucket].amount += outstanding;

      if (groupByCustomer) {
        let group = customerMap.get(row.customerId);
        if (!group) {
          group = {
            customerId: row.customerId,
            customerName: row.customer.name,
            customerPhone: row.customer.phone,
            buckets: emptyAgingTotals(),
            totalOutstanding: 0,
          };
          customerMap.set(row.customerId, group);
        }
        group.buckets[bucket].count += 1;
        group.buckets[bucket].amount += outstanding;
        group.totalOutstanding += outstanding;
      } else {
        agingRows!.push({
          receivableId: row.id,
          customerId: row.customerId,
          customerName: row.customer.name,
          customerPhone: row.customer.phone,
          outletId: row.outletId,
          outletName: row.outlet?.name ?? null,
          outstanding,
          dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
          daysOverdue,
          bucket,
          createdAt: row.createdAt.toISOString(),
        });
      }
    }

    const totals = AGING_BUCKET_ORDER.map((bucket) => ({
      bucket,
      label: RECEIVABLE_AGING_BUCKET_LABELS[bucket],
      count: totalsMap[bucket].count,
      amount: totalsMap[bucket].amount,
    }));

    const totalOutstanding = totals.reduce((sum, t) => sum + t.amount, 0);

    return {
      asOf: asOf.toISOString().slice(0, 10),
      outletId,
      groupByCustomer,
      totals,
      totalOutstanding,
      ...(groupByCustomer
        ? {
            byCustomer: Array.from(customerMap.values()).map((c) => ({
              customerId: c.customerId,
              customerName: c.customerName,
              customerPhone: c.customerPhone,
              totalOutstanding: c.totalOutstanding,
              buckets: AGING_BUCKET_ORDER.map((bucket) => ({
                bucket,
                label: RECEIVABLE_AGING_BUCKET_LABELS[bucket],
                count: c.buckets[bucket].count,
                amount: c.buckets[bucket].amount,
              })),
            })),
          }
        : { rows: agingRows }),
    };
  }

  async getCustomerStatement(
    user: AuthJwtPayload,
    customerId: string,
    query: CustomerStatementQueryDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true, name: true, phone: true, creditLimit: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    const fromDate = new Date(`${query.from.slice(0, 10)}T00:00:00.000Z`);
    const toDateEnd = new Date(`${query.to.slice(0, 10)}T23:59:59.999Z`);

    const receivables = await this.prisma.receivable.findMany({
      where: { tenantId: user.tenantId, customerId },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        transaction: { select: { receiptNo: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    let openingBalance = 0;
    for (const row of receivables) {
      if (row.status === 'VOID') continue;
      const amount = toIdrInteger(row.amount);
      const paidBeforeFrom = row.payments
        .filter((p) => p.createdAt < fromDate)
        .reduce((sum, p) => sum + toIdrInteger(p.amount), 0);
      if (row.createdAt < fromDate) {
        openingBalance += Math.max(0, amount - paidBeforeFrom);
      }
    }

    type RawEntry = {
      id: string;
      date: Date;
      type: 'INVOICE' | 'PAYMENT';
      description: string;
      reference: string | null;
      debit: number;
      credit: number;
    };

    const rawEntries: RawEntry[] = [];

    for (const row of receivables) {
      if (row.status === 'VOID') continue;
      const amount = toIdrInteger(row.amount);
      if (row.createdAt >= fromDate && row.createdAt <= toDateEnd) {
        rawEntries.push({
          id: row.id,
          date: row.createdAt,
          type: 'INVOICE',
          description: row.transaction?.receiptNo
            ? `Piutang transaksi ${row.transaction.receiptNo}`
            : 'Piutang manual',
          reference: row.transaction?.receiptNo ?? null,
          debit: amount,
          credit: 0,
        });
      }
      for (const payment of row.payments) {
        if (payment.createdAt >= fromDate && payment.createdAt <= toDateEnd) {
          rawEntries.push({
            id: payment.id,
            date: payment.createdAt,
            type: 'PAYMENT',
            description: `Pembayaran piutang (${payment.method})`,
            reference: payment.reference,
            debit: 0,
            credit: toIdrInteger(payment.amount),
          });
        }
      }
    }

    rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = openingBalance;
    const entries = rawEntries.map((entry) => {
      running += entry.debit - entry.credit;
      return {
        id: entry.id,
        date: entry.date.toISOString(),
        type: entry.type,
        description: entry.description,
        reference: entry.reference,
        debit: entry.debit,
        credit: entry.credit,
        balanceAfter: running,
      };
    });

    const deposit = await this.prisma.customerDeposit.findUnique({
      where: { customerId },
      select: { balance: true, status: true, tenantId: true },
    });
    const depositBalance =
      deposit && deposit.tenantId === user.tenantId && deposit.status === 'ACTIVE'
        ? toIdrInteger(deposit.balance)
        : 0;

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        creditLimit: customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null,
      },
      period: { from: query.from.slice(0, 10), to: query.to.slice(0, 10) },
      openingBalance,
      entries,
      closingBalance: running,
      depositBalance,
      generatedAt: new Date().toISOString(),
    };
  }

  async updateCustomerCreditLimit(
    user: AuthJwtPayload,
    customerId: string,
    dto: UpdateCustomerCreditLimitDto,
  ) {
    return this.creditLimitService.setCreditLimit(user, customerId, {
      creditLimit: dto.creditLimit,
      notes: 'Penyesuaian limit via modul piutang',
    });
  }

  async getCustomerFinanceSummary(user: AuthJwtPayload, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true, name: true, phone: true, creditLimit: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
    const summary = await this.financeCheckout.getCustomerFinanceSummary(user.tenantId, customerId);
    const receivables = await this.list(user, { customerId });
    const deposit = await this.prisma.customerDeposit.findUnique({
      where: { customerId },
      include: {
        ledger: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        creditLimit: customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null,
      },
      finance: summary,
      receivables,
      deposit: deposit
        ? {
            id: deposit.id,
            balance: toIdrInteger(deposit.balance),
            status: deposit.status,
            recentLedger: deposit.ledger.map((entry) => ({
              id: entry.id,
              type: entry.type,
              amount: toIdrInteger(entry.amount),
              balanceAfter: toIdrInteger(entry.balanceAfter),
              referenceType: entry.referenceType,
              referenceId: entry.referenceId,
              notes: entry.notes,
              createdAt: entry.createdAt.toISOString(),
            })),
          }
        : null,
    };
  }

  private mapReceivable(
    row: {
      id: string;
      tenantId: string;
      customerId: string;
      outletId: string | null;
      transactionId: string | null;
      amount: { toString(): string } | Decimal;
      paidAmount: { toString(): string } | Decimal;
      status: string;
      dueDate: Date | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      customer?: { id: string; name: string; phone: string; creditLimit?: { toString(): string } | Decimal | null };
      outlet?: { id: string; code: string; name: string } | null;
      transaction?: { id: string; receiptNo: string; total?: { toString(): string } | Decimal; createdAt?: Date } | null;
      payments?: Array<{
        id: string;
        amount: { toString(): string } | Decimal;
        method: string;
        reference: string | null;
        createdAt: Date;
        recordedBy: { id: string; fullName: string };
      }>;
    },
    includePayments = false,
  ) {
    const amount = toIdrInteger(row.amount);
    const paidAmount = toIdrInteger(row.paidAmount);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue =
      (row.status === 'OPEN' || row.status === 'PARTIAL') &&
      row.dueDate != null &&
      row.dueDate < today;

    return {
      id: row.id,
      customerId: row.customerId,
      outletId: row.outletId,
      transactionId: row.transactionId,
      amount,
      paidAmount,
      outstanding: computeOutstanding(amount, paidAmount),
      status: row.status,
      computedStatus: computeReceivableStatus(amount, paidAmount, row.status === 'VOID'),
      isOverdue,
      dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      customer: row.customer
        ? {
            ...row.customer,
            creditLimit:
              row.customer.creditLimit != null ? toIdrInteger(row.customer.creditLimit) : null,
          }
        : undefined,
      outlet: row.outlet ?? undefined,
      transaction: row.transaction
        ? {
            id: row.transaction.id,
            receiptNo: row.transaction.receiptNo,
            total: row.transaction.total != null ? toIdrInteger(row.transaction.total) : undefined,
            createdAt: row.transaction.createdAt?.toISOString(),
          }
        : undefined,
      payments:
        includePayments && row.payments
          ? row.payments.map((p) => ({
              id: p.id,
              amount: toIdrInteger(p.amount),
              method: p.method,
              reference: p.reference,
              recordedBy: p.recordedBy,
              createdAt: p.createdAt.toISOString(),
            }))
          : undefined,
    };
  }
}
