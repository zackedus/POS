import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FinanceCheckoutService } from './finance-checkout.service';
import { computeOutstanding, computeReceivableStatus } from './finance.util';
import type {
  CreateReceivableDto,
  ListReceivablesQueryDto,
  RecordReceivablePaymentDto,
  UpdateCustomerCreditLimitDto,
} from './dto/receivable.dto';

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeCheckout: FinanceCheckoutService,
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
      select: { id: true },
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

    return this.getById(user, receivableId);
  }

  async listOverdue(user: AuthJwtPayload) {
    return this.list(user, { status: 'OVERDUE' });
  }

  async updateCustomerCreditLimit(
    user: AuthJwtPayload,
    customerId: string,
    dto: UpdateCustomerCreditLimitDto,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    if (dto.creditLimit != null) {
      const outstanding = await this.financeCheckout.getCustomerOutstandingReceivableIdr(
        user.tenantId,
        customerId,
      );
      if (dto.creditLimit < outstanding) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: `Limit kredit tidak boleh di bawah outstanding piutang (${outstanding}).`,
        });
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        creditLimit:
          dto.creditLimit === undefined
            ? undefined
            : dto.creditLimit === null
              ? null
              : idrToDecimal(dto.creditLimit),
      },
      select: { id: true, name: true, phone: true, creditLimit: true, points: true },
    });

    const summary = await this.financeCheckout.getCustomerFinanceSummary(user.tenantId, customerId);
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      points: updated.points,
      creditLimit: updated.creditLimit != null ? toIdrInteger(updated.creditLimit) : null,
      finance: summary,
    };
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
