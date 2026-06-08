import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { CustomerCreditAuditAction, Prisma } from '@barokah/database';
import { UserRole } from '@barokah/database';
import {
  CREDIT_APPROVAL_TOKEN_TTL_MS,
  CREDIT_AUTO_INCREASE_AMOUNT_IDR,
  CREDIT_AUTO_INCREASE_MAX_LIMIT_IDR,
  CREDIT_AUTO_INCREASE_THRESHOLD_IDR,
  DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR,
  ErrorCodes,
} from '@barokah/shared';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { FinanceCheckoutService } from './finance-checkout.service';
import type { CreditApprovalDto } from './dto/credit-approval.dto';

type TxClient = Prisma.TransactionClient;

interface StoredCreditApproval {
  tenantId: string;
  customerId: string;
  creditAmount: number;
  approvedById: string;
  expiresAt: number;
}

@Injectable()
export class CreditLimitService {
  private readonly approvalTokens = new Map<string, StoredCreditApproval>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly financeCheckout: FinanceCheckoutService,
  ) {}

  clearApprovalTokensForTests(): void {
    this.approvalTokens.clear();
  }

  getDefaultCreditLimitDecimal() {
    return idrToDecimal(DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR);
  }

  async writeAuditLog(
    tx: TxClient,
    params: {
      tenantId: string;
      customerId: string;
      action: CustomerCreditAuditAction;
      oldLimit?: number | null;
      newLimit?: number | null;
      amount?: number | null;
      transactionId?: string | null;
      approvedById?: string | null;
      recordedById?: string | null;
      notes?: string | null;
    },
  ) {
    await tx.customerCreditAuditLog.create({
      data: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        action: params.action,
        oldLimit:
          params.oldLimit === undefined || params.oldLimit === null
            ? null
            : idrToDecimal(params.oldLimit),
        newLimit:
          params.newLimit === undefined || params.newLimit === null
            ? null
            : idrToDecimal(params.newLimit),
        amount:
          params.amount === undefined || params.amount === null
            ? null
            : idrToDecimal(params.amount),
        transactionId: params.transactionId ?? null,
        approvedById: params.approvedById ?? null,
        recordedById: params.recordedById ?? null,
        notes: params.notes?.trim() || null,
      },
    });
  }

  async logDefaultLimitOnCreate(
    tx: TxClient,
    params: { tenantId: string; customerId: string; recordedById?: string | null },
  ) {
    await this.writeAuditLog(tx, {
      tenantId: params.tenantId,
      customerId: params.customerId,
      action: 'LIMIT_SET',
      oldLimit: null,
      newLimit: DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR,
      recordedById: params.recordedById ?? null,
      notes: 'Limit default pelanggan baru (1 jt)',
    });
  }

  async setCreditLimit(
    user: AuthJwtPayload,
    customerId: string,
    params: {
      creditLimit?: number | null;
      autoLimitEnabled?: boolean;
      notes?: string;
    },
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

    if (params.creditLimit != null) {
      const outstanding = await this.financeCheckout.getCustomerOutstandingReceivableIdr(
        user.tenantId,
        customerId,
      );
      if (params.creditLimit < outstanding) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: `Limit kredit tidak boleh di bawah outstanding piutang (${outstanding}).`,
        });
      }
    }

    const oldLimitIdr = customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.customer.update({
        where: { id: customerId },
        data: {
          ...(params.creditLimit !== undefined
            ? {
                creditLimit:
                  params.creditLimit === null ? null : idrToDecimal(params.creditLimit),
              }
            : {}),
          ...(params.autoLimitEnabled !== undefined
            ? { autoLimitEnabled: params.autoLimitEnabled }
            : {}),
        },
      });

      if (params.creditLimit !== undefined) {
        const newLimitIdr = params.creditLimit;
        await this.writeAuditLog(tx, {
          tenantId: user.tenantId,
          customerId,
          action: 'LIMIT_SET',
          oldLimit: oldLimitIdr,
          newLimit: newLimitIdr,
          recordedById: user.sub,
          notes: params.notes?.trim() || 'Penyesuaian limit manual',
        });
      }

      return row;
    });

    const summary = await this.financeCheckout.getCustomerFinanceSummary(user.tenantId, customerId);
    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
      points: updated.points,
      memberCode: updated.memberCode,
      creditLimit: updated.creditLimit != null ? toIdrInteger(updated.creditLimit) : null,
      autoLimitEnabled: updated.autoLimitEnabled,
      finance: summary,
    };
  }

  async listCreditAuditLog(
    user: AuthJwtPayload,
    customerId: string,
    page = 1,
    limit = 20,
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    const skip = (page - 1) * limit;
    const [total, rows] = await Promise.all([
      this.prisma.customerCreditAuditLog.count({
        where: { tenantId: user.tenantId, customerId },
      }),
      this.prisma.customerCreditAuditLog.findMany({
        where: { tenantId: user.tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          approvedBy: { select: { id: true, fullName: true } },
          recordedBy: { select: { id: true, fullName: true } },
          transaction: { select: { id: true, receiptNo: true } },
        },
      }),
    ]);

    return {
      entries: rows.map((row) => ({
        id: row.id,
        action: row.action,
        oldLimit: row.oldLimit != null ? toIdrInteger(row.oldLimit) : null,
        newLimit: row.newLimit != null ? toIdrInteger(row.newLimit) : null,
        amount: row.amount != null ? toIdrInteger(row.amount) : null,
        transactionId: row.transactionId,
        receiptNo: row.transaction?.receiptNo ?? null,
        approvedBy: row.approvedBy
          ? { id: row.approvedBy.id, fullName: row.approvedBy.fullName }
          : null,
        recordedBy: row.recordedBy
          ? { id: row.recordedBy.id, fullName: row.recordedBy.fullName }
          : null,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  private async resolveCreditApprover(
    user: AuthJwtPayload,
    dto: CreditApprovalDto,
    outletId: string,
  ): Promise<string> {
    const privilegedRoles = new Set<string>([UserRole.OWNER, UserRole.MANAGER]);
    if (privilegedRoles.has(user.role)) {
      return user.sub;
    }

    const managerEmail = dto.managerEmail?.trim().toLowerCase();
    const managerPassword = dto.managerPassword;
    if (!managerEmail || !managerPassword) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_APPROVAL_REQUIRED,
        message: 'Persetujuan manager wajib. Isi email dan password manager.',
      });
    }

    const manager = await this.prisma.user.findFirst({
      where: {
        email: managerEmail,
        isActive: true,
        tenantId: user.tenantId,
        role: { in: [UserRole.OWNER, UserRole.MANAGER] },
        userOutlets: { some: { outletId } },
      },
    });

    if (!manager) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Kredensial manager tidak valid atau tidak memiliki akses outlet ini.',
      });
    }

    const passwordValid = await bcrypt.compare(managerPassword, manager.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Kredensial manager tidak valid atau tidak memiliki akses outlet ini.',
      });
    }

    if (manager.id === user.sub) {
      throw new ForbiddenException({
        code: ErrorCodes.CREDIT_APPROVAL_SELF_DENIED,
        message: 'Kasir tidak boleh menyetujui over-limit transaksi sendiri.',
      });
    }

    return manager.id;
  }

  async issueCreditApproval(user: AuthJwtPayload, dto: CreditApprovalDto) {
    const outletId = resolveOutletId(user, dto.outletId);
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

    const creditLimitIdr = customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null;
    if (creditLimitIdr === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_NOT_ALLOWED,
        message: 'Pelanggan tidak diizinkan transaksi tempo.',
      });
    }

    const outstanding = await this.financeCheckout.getCustomerOutstandingReceivableIdr(
      user.tenantId,
      dto.customerId,
    );

    if (creditLimitIdr != null && outstanding + dto.creditAmount <= creditLimitIdr) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Transaksi tidak melebihi limit — persetujuan manager tidak diperlukan.',
      });
    }

    const approvedById = await this.resolveCreditApprover(user, dto, outletId);
    const token = randomBytes(24).toString('hex');
    const expiresAt = Date.now() + CREDIT_APPROVAL_TOKEN_TTL_MS;

    this.approvalTokens.set(token, {
      tenantId: user.tenantId,
      customerId: dto.customerId,
      creditAmount: dto.creditAmount,
      approvedById,
      expiresAt,
    });

    return {
      approvalToken: token,
      expiresAt: new Date(expiresAt).toISOString(),
      approvedById,
    };
  }

  validateAndConsumeApprovalToken(
    token: string,
    params: { tenantId: string; customerId: string; creditAmount: number },
  ): { approvedById: string } {
    const stored = this.approvalTokens.get(token);
    if (!stored) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_APPROVAL_INVALID,
        message: 'Token persetujuan kredit tidak valid atau sudah digunakan.',
      });
    }

    if (
      stored.tenantId !== params.tenantId ||
      stored.customerId !== params.customerId ||
      stored.creditAmount !== params.creditAmount
    ) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_APPROVAL_INVALID,
        message: 'Token persetujuan tidak cocok dengan pelanggan atau nominal tempo.',
      });
    }

    if (Date.now() > stored.expiresAt) {
      this.approvalTokens.delete(token);
      throw new UnprocessableEntityException({
        code: ErrorCodes.CREDIT_APPROVAL_INVALID,
        message: 'Token persetujuan kredit sudah kedaluwarsa. Minta persetujuan ulang.',
      });
    }

    this.approvalTokens.delete(token);
    return { approvedById: stored.approvedById };
  }

  async recalculateAutoLimit(tenantId: string, customerId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, creditLimit: true, autoLimitEnabled: true },
    });
    if (!customer || !customer.autoLimitEnabled || customer.creditLimit == null) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = await this.prisma.receivable.count({
      where: {
        tenantId,
        customerId,
        status: { in: ['OPEN', 'PARTIAL'] },
        dueDate: { lt: today },
      },
    });
    if (overdueCount > 0) {
      return false;
    }

    const paidReceivables = await this.prisma.receivable.findMany({
      where: { tenantId, customerId, status: 'PAID' },
      select: { amount: true },
    });
    const cumulativePaid = paidReceivables.reduce(
      (sum, row) => sum + toIdrInteger(row.amount),
      0,
    );

    const earnedSteps = Math.floor(cumulativePaid / CREDIT_AUTO_INCREASE_THRESHOLD_IDR);
    const targetLimit =
      DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR + earnedSteps * CREDIT_AUTO_INCREASE_AMOUNT_IDR;
    const cappedLimit = Math.min(targetLimit, CREDIT_AUTO_INCREASE_MAX_LIMIT_IDR);
    const currentLimit = toIdrInteger(customer.creditLimit);

    if (cappedLimit <= currentLimit) {
      return false;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: customerId },
        data: { creditLimit: idrToDecimal(cappedLimit) },
      });
      await this.writeAuditLog(tx, {
        tenantId,
        customerId,
        action: 'LIMIT_AUTO_INCREASE',
        oldLimit: currentLimit,
        newLimit: cappedLimit,
        notes: `Auto-increase: piutang lunas kumulatif ${cumulativePaid.toLocaleString('id-ID')} IDR`,
      });
    });

    return true;
  }

  async logCreditCheckoutInTransaction(
    tx: TxClient,
    params: {
      tenantId: string;
      customerId: string;
      creditAmount: number;
      transactionId: string;
      recordedById: string;
      approvedById?: string | null;
      overLimitApproved?: boolean;
    },
  ) {
    const customer = await tx.customer.findFirst({
      where: { id: params.customerId, tenantId: params.tenantId },
      select: { creditLimit: true },
    });
    const limitIdr = customer?.creditLimit != null ? toIdrInteger(customer.creditLimit) : null;

    if (params.overLimitApproved && params.approvedById) {
      await this.writeAuditLog(tx, {
        tenantId: params.tenantId,
        customerId: params.customerId,
        action: 'OVER_LIMIT_APPROVAL',
        oldLimit: limitIdr,
        newLimit: limitIdr,
        amount: params.creditAmount,
        transactionId: params.transactionId,
        approvedById: params.approvedById,
        recordedById: params.recordedById,
        notes: 'Checkout tempo melebihi limit dengan persetujuan manager',
      });
    }

    await this.writeAuditLog(tx, {
      tenantId: params.tenantId,
      customerId: params.customerId,
      action: 'CREDIT_SALE',
      oldLimit: limitIdr,
      newLimit: limitIdr,
      amount: params.creditAmount,
      transactionId: params.transactionId,
      recordedById: params.recordedById,
      notes: 'Penjualan tempo dari checkout POS',
    });
  }
}
