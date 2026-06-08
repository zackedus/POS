import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { ListDepositsQueryDto, RefundDepositDto, TopUpDepositDto } from './dto/deposit.dto';
import { PaymentReceiptService } from './payment-receipt.service';

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentReceipt: PaymentReceiptService,
  ) {}

  async list(user: AuthJwtPayload, query: ListDepositsQueryDto) {
    const where: { tenantId: string; customerId?: string } = { tenantId: user.tenantId };
    if (query.customerId) where.customerId = query.customerId;

    const rows = await this.prisma.customerDeposit.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        ledger: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((row) => this.mapDepositSummary(row));
  }

  async getByCustomerId(user: AuthJwtPayload, customerId: string) {
    await this.ensureCustomer(user.tenantId, customerId);
    let deposit = await this.prisma.customerDeposit.findUnique({
      where: { customerId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        ledger: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { recordedBy: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!deposit) {
      deposit = await this.prisma.customerDeposit.create({
        data: {
          tenantId: user.tenantId,
          customerId,
          balance: idrToDecimal(0),
          status: 'ACTIVE',
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          ledger: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { recordedBy: { select: { id: true, fullName: true } } },
          },
        },
      });
    }
    if (deposit.tenantId !== user.tenantId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Deposit tidak ditemukan.',
      });
    }
    return this.mapDepositDetail(deposit);
  }

  async topUp(user: AuthJwtPayload, dto: TopUpDepositDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId: user.tenantId },
      select: { id: true, name: true, phone: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    let balanceBefore = 0;
    let balanceAfter = 0;
    let paymentId = '';
    let receiptNumber = '';
    let createdAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      let deposit = await tx.customerDeposit.findUnique({ where: { customerId: dto.customerId } });
      if (!deposit) {
        deposit = await tx.customerDeposit.create({
          data: {
            tenantId: user.tenantId,
            customerId: dto.customerId,
            balance: idrToDecimal(0),
            status: 'ACTIVE',
          },
        });
      }
      if (deposit.status !== 'ACTIVE') {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Akun deposit tidak aktif.',
        });
      }
      balanceBefore = toIdrInteger(deposit.balance);
      balanceAfter = balanceBefore + dto.amount;
      receiptNumber = await this.paymentReceipt.nextReceiptNumber(tx, user.tenantId, 'DEP');
      await tx.customerDeposit.update({
        where: { id: deposit.id },
        data: { balance: idrToDecimal(balanceAfter) },
      });
      const ledgerEntry = await tx.depositTransaction.create({
        data: {
          depositId: deposit.id,
          type: 'TOP_UP',
          amount: idrToDecimal(dto.amount),
          balanceAfter: idrToDecimal(balanceAfter),
          receiptNumber,
          referenceType: 'manual',
          notes: dto.notes?.trim() || 'Top-up deposit pelanggan',
          recordedById: user.sub,
        },
      });
      paymentId = ledgerEntry.id;
      createdAt = ledgerEntry.createdAt;
    });

    const [detail, storeName, recorder] = await Promise.all([
      this.getByCustomerId(user, dto.customerId),
      this.paymentReceipt.getTenantName(user.tenantId),
      this.prisma.user.findUnique({ where: { id: user.sub }, select: { fullName: true } }),
    ]);

    const receipt = this.paymentReceipt.buildReceiptView({
      kind: 'DEPOSIT_TOP_UP',
      receiptNumber,
      amount: dto.amount,
      method: 'CASH',
      createdAt,
      recordedByName: recorder?.fullName ?? 'Petugas',
      counterpartyName: customer.name,
      counterpartyPhone: customer.phone,
      storeName,
      balanceBefore,
      balanceAfter,
      notes: dto.notes ?? null,
      paymentId,
    });

    return { ...detail, receipt };
  }

  async refund(user: AuthJwtPayload, customerId: string, dto: RefundDepositDto) {
    await this.ensureCustomer(user.tenantId, customerId);

    await this.prisma.$transaction(async (tx) => {
      const deposit = await tx.customerDeposit.findUnique({ where: { customerId } });
      if (!deposit || deposit.tenantId !== user.tenantId) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Deposit tidak ditemukan.',
        });
      }
      if (deposit.status !== 'ACTIVE') {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Akun deposit tidak aktif.',
        });
      }
      const current = toIdrInteger(deposit.balance);
      if (dto.amount <= 0 || dto.amount > current) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
          message: `Saldo deposit tidak mencukupi. Tersedia: ${current}.`,
        });
      }
      const newBalance = current - dto.amount;
      await tx.customerDeposit.update({
        where: { id: deposit.id },
        data: { balance: idrToDecimal(newBalance) },
      });
      await tx.depositTransaction.create({
        data: {
          depositId: deposit.id,
          type: 'REFUND',
          amount: idrToDecimal(dto.amount),
          balanceAfter: idrToDecimal(newBalance),
          referenceType: 'manual',
          notes: dto.notes?.trim() || 'Refund deposit ke pelanggan',
          recordedById: user.sub,
        },
      });
    });

    return this.getByCustomerId(user, customerId);
  }

  private async ensureCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
  }

  private mapDepositSummary(row: {
    id: string;
    customerId: string;
    balance: { toString(): string } | Decimal;
    status: string;
    updatedAt: Date;
    customer: { id: string; name: string; phone: string };
    ledger: Array<{ createdAt: Date }>;
  }) {
    return {
      id: row.id,
      customerId: row.customerId,
      balance: toIdrInteger(row.balance),
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      customer: row.customer,
      lastActivityAt: row.ledger[0]?.createdAt.toISOString() ?? row.updatedAt.toISOString(),
    };
  }

  private mapDepositDetail(row: {
    id: string;
    customerId: string;
    balance: { toString(): string } | Decimal;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    customer: { id: string; name: string; phone: string };
    ledger: Array<{
      id: string;
      type: string;
      amount: { toString(): string } | Decimal;
      balanceAfter: { toString(): string } | Decimal;
      referenceType: string | null;
      referenceId: string | null;
      notes: string | null;
      createdAt: Date;
      recordedBy: { id: string; fullName: string };
    }>;
  }) {
    return {
      id: row.id,
      customerId: row.customerId,
      balance: toIdrInteger(row.balance),
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      customer: row.customer,
      ledger: row.ledger.map((entry) => ({
        id: entry.id,
        type: entry.type,
        amount: toIdrInteger(entry.amount),
        balanceAfter: toIdrInteger(entry.balanceAfter),
        receiptNumber: (entry as { receiptNumber?: string | null }).receiptNumber ?? null,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        notes: entry.notes,
        recordedBy: entry.recordedBy,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }
}
