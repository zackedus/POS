import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { assertOutletAccess, resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CloseShiftDto } from './dto/close-shift.dto';
import { ForceCloseShiftDto } from './dto/force-close-shift.dto';
import { OpenShiftDto } from './dto/open-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async openShift(user: AuthJwtPayload, dto: OpenShiftDto) {
    const outletId = resolveOutletId(user, dto.outletId);

    const activeShift = await this.prisma.shift.findFirst({
      where: {
        outletId,
        cashierId: user.sub,
        closedAt: null,
      },
    });

    if (activeShift) {
      throw new ConflictException({
        code: ErrorCodes.SHIFT_ALREADY_OPEN,
        message: 'Shift aktif sudah ada untuk kasir ini.',
      });
    }

    const shift = await this.prisma.shift.create({
      data: {
        outletId,
        cashierId: user.sub,
        openingCash: idrToDecimal(dto.openingCash),
      },
    });

    return {
      id: shift.id,
      outletId: shift.outletId,
      cashierId: shift.cashierId,
      openingCash: toIdrInteger(shift.openingCash),
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
    };
  }

  async getActiveShift(user: AuthJwtPayload, outletId?: string) {
    const resolvedOutletId = resolveOutletId(user, outletId);
    const shift = await this.prisma.shift.findFirst({
      where: {
        outletId: resolvedOutletId,
        cashierId: user.sub,
        closedAt: null,
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!shift) {
      return null;
    }

    return {
      id: shift.id,
      outletId: shift.outletId,
      cashierId: shift.cashierId,
      openingCash: toIdrInteger(shift.openingCash),
      openedAt: shift.openedAt,
      closedAt: shift.closedAt,
    };
  }

  async getClosePreview(user: AuthJwtPayload, shiftId: string, outletId?: string) {
    const shift = await this.getShiftForClose(user, shiftId, outletId);
    const { openingCash, cashSales, expectedCash, transactionCount } = await this.computeShiftCashSummary(shift);
    const heldCount = await this.prisma.heldTransaction.count({
      where: {
        outletId: shift.outletId,
        expiresAt: { gt: new Date() },
      },
    });
    return {
      shiftId: shift.id,
      openingCash,
      cashSales,
      expectedCash,
      transactionCount,
      heldCount,
      heldWarning:
        heldCount > 0
          ? `${heldCount} transaksi hold masih aktif — tidak memblokir tutup shift, tetapi pastikan sudah direcall atau expire.`
          : null,
      openedAt: shift.openedAt,
    };
  }

  private async getShiftForClose(user: AuthJwtPayload, shiftId: string, outletId?: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        outlet: { select: { tenantId: true } },
        transactions: {
          where: { status: 'COMPLETED' },
          include: { payments: true },
        },
      },
    });

    if (!shift || shift.outlet.tenantId !== user.tenantId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Shift tidak ditemukan.',
      });
    }

    if (shift.cashierId !== user.sub && user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Hanya kasir pemilik shift atau manager/owner yang dapat melihat preview penutupan shift ini.',
      });
    }

    assertOutletAccess(user, shift.outletId);

    if (outletId && shift.outletId !== resolveOutletId(user, outletId)) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Shift tidak ditemukan.',
      });
    }

    if (shift.closedAt) {
      throw new ConflictException({
        code: ErrorCodes.SHIFT_ALREADY_CLOSED,
        message: 'Shift sudah ditutup.',
      });
    }

    return shift;
  }

  private async computeShiftCashSummary(shift: {
    openingCash: Decimal;
    transactions: Array<{
      total: Decimal;
      payments: Array<{ method: string; amount: Decimal }>;
    }>;
  }) {
    const openingCash = toIdrInteger(shift.openingCash);
    let cashSales = 0;
    for (const transaction of shift.transactions) {
      const cashPayments = transaction.payments.filter((payment) => payment.method === 'CASH');
      if (cashPayments.length === 1 && transaction.payments.length === 1) {
        cashSales += toIdrInteger(transaction.total);
      } else {
        cashSales += cashPayments.reduce((sum, payment) => sum + toIdrInteger(payment.amount), 0);
      }
    }
    return {
      openingCash,
      cashSales,
      expectedCash: openingCash + cashSales,
      transactionCount: shift.transactions.length,
    };
  }

  async closeShift(user: AuthJwtPayload, shiftId: string, dto: CloseShiftDto) {
    const shift = await this.getShiftForClose(user, shiftId);
    const { expectedCash } = await this.computeShiftCashSummary(shift);
    const closingCash = dto.closingCash;
    const difference = closingCash - expectedCash;
    const closedAt = new Date();

    const updated = await this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        closingCash: idrToDecimal(closingCash),
        expectedCash: idrToDecimal(expectedCash),
        difference: idrToDecimal(difference),
        closedAt,
      },
    });

    return {
      id: updated.id,
      outletId: updated.outletId,
      cashierId: updated.cashierId,
      openingCash: toIdrInteger(updated.openingCash),
      closingCash: toIdrInteger(updated.closingCash!),
      expectedCash: toIdrInteger(updated.expectedCash!),
      difference: toIdrInteger(updated.difference!),
      openedAt: updated.openedAt,
      closedAt: updated.closedAt,
    };
  }

  async forceCloseShift(user: AuthJwtPayload, shiftId: string, dto: ForceCloseShiftDto) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Hanya manager atau owner yang dapat menutup paksa shift.',
      });
    }

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { outlet: { select: { tenantId: true } } },
    });

    if (!shift || shift.outlet.tenantId !== user.tenantId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Shift tidak ditemukan.',
      });
    }

    assertOutletAccess(user, shift.outletId);

    if (shift.closedAt) {
      throw new ConflictException({
        code: ErrorCodes.SHIFT_ALREADY_CLOSED,
        message: 'Shift sudah ditutup.',
      });
    }

    const closedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const closedShift = await tx.shift.update({
        where: { id: shiftId },
        data: { closedAt },
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'SHIFT_FORCE_CLOSE',
          entityType: 'shift',
          entityId: shiftId,
          metadata: {
            outletId: shift.outletId,
            cashierId: shift.cashierId,
            reason: dto.reason?.trim() || null,
            openedAt: shift.openedAt.toISOString(),
            closedAt: closedAt.toISOString(),
          },
        },
      });

      return closedShift;
    });

    return {
      id: updated.id,
      outletId: updated.outletId,
      cashierId: updated.cashierId,
      openingCash: toIdrInteger(updated.openingCash),
      openedAt: updated.openedAt,
      closedAt: updated.closedAt,
      forceClosed: true,
      forceClosedBy: user.sub,
      reason: dto.reason?.trim() || null,
    };
  }
}
