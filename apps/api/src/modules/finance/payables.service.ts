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
import { buildPaginationMeta, resolvePagination } from '../../common/utils/pagination.util';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { computeOutstanding, computePayableStatus } from './finance.util';
import { PaymentReceiptService } from './payment-receipt.service';
import type {
  CreatePayableDto,
  CreatePayableFromPoDto,
  ListPayablesQueryDto,
  RecordPayablePaymentDto,
} from './dto/payable.dto';

@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentReceipt: PaymentReceiptService,
  ) {}

  async list(user: AuthJwtPayload, query: ListPayablesQueryDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const where: Prisma.PayableWhereInput = { tenantId: user.tenantId };

    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.outletId) {
      const outletId = resolveOutletId(user, query.outletId);
      where.OR = [{ purchaseOrder: { outletId } }, { poId: null }];
    }
    if (query.status === 'OVERDUE') {
      where.AND = [{ status: { in: ['OPEN', 'PARTIAL'] }, dueDate: { lt: today } }];
    } else if (query.status) {
      where.status = query.status;
    } else if (query.overdueOnly) {
      where.AND = [{ status: { in: ['OPEN', 'PARTIAL'] }, dueDate: { lt: today } }];
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.supplier = {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
        ],
      };
    }

    const { page, limit, skip } = resolvePagination(query);
    const [rows, total] = await Promise.all([
      this.prisma.payable.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          purchaseOrder: { select: { id: true, orderNo: true, status: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            include: { recordedBy: { select: { id: true, fullName: true } } },
          },
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.payable.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.mapPayable(row)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getById(user: AuthJwtPayload, payableId: string) {
    const row = await this.prisma.payable.findFirst({
      where: { id: payableId, tenantId: user.tenantId },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        purchaseOrder: { select: { id: true, orderNo: true, status: true, receivedAt: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Utang tidak ditemukan.',
      });
    }
    return this.mapPayable(row, true);
  }

  async create(user: AuthJwtPayload, dto: CreatePayableDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId: user.tenantId, isActive: true },
    });
    if (!supplier) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Supplier tidak ditemukan.',
      });
    }

    if (dto.poId) {
      const existing = await this.prisma.payable.findUnique({ where: { poId: dto.poId } });
      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_ENTRY,
          message: 'Utang untuk PO ini sudah ada.',
        });
      }
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.poId, tenantId: user.tenantId },
      });
      if (!po) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Purchase order tidak ditemukan.',
        });
      }
    }

    const row = await this.prisma.payable.create({
      data: {
        tenantId: user.tenantId,
        supplierId: dto.supplierId,
        poId: dto.poId ?? null,
        amount: idrToDecimal(dto.amount),
        paidAmount: idrToDecimal(0),
        status: 'OPEN',
        dueDate: dto.dueDate ? new Date(`${dto.dueDate.slice(0, 10)}T00:00:00.000Z`) : null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        purchaseOrder: { select: { id: true, orderNo: true, status: true } },
      },
    });
    return this.mapPayable(row);
  }

  async createFromPurchaseOrder(
    user: AuthJwtPayload,
    purchaseOrderId: string,
    dto: CreatePayableFromPoDto,
  ) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId: user.tenantId },
      include: {
        items: true,
        receipts: { include: { lines: true } },
        payable: true,
      },
    });
    if (!po) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Purchase order tidak ditemukan.',
      });
    }
    if (po.payable) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: 'Utang untuk PO ini sudah ada.',
      });
    }
    if (po.status !== 'RECEIVED' && po.status !== 'PARTIALLY_RECEIVED') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'PO harus sudah diterima sebagian/penuh untuk membuat utang.',
      });
    }

    let amountIdr = 0;
    for (const receipt of po.receipts) {
      for (const line of receipt.lines) {
        amountIdr += Math.round(Number(line.quantityReceived) * Number(line.unitCost));
      }
    }
    if (amountIdr <= 0) {
      for (const item of po.items) {
        amountIdr += Math.round(Number(item.receivedQuantity) * Number(item.unitCost));
      }
    }
    if (amountIdr <= 0) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Tidak ada nilai penerimaan untuk dijadikan utang.',
      });
    }

    return this.create(user, {
      supplierId: po.supplierId,
      poId: po.id,
      amount: amountIdr,
      dueDate: dto.dueDate,
      notes: dto.notes?.trim() || `Utang dari PO ${po.orderNo}`,
    });
  }

  async recordPayment(user: AuthJwtPayload, payableId: string, dto: RecordPayablePaymentDto) {
    const payable = await this.prisma.payable.findFirst({
      where: { id: payableId, tenantId: user.tenantId },
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        purchaseOrder: { select: { orderNo: true, outlet: { select: { name: true } } } },
      },
    });
    if (!payable) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Utang tidak ditemukan.',
      });
    }
    if (payable.status === 'VOID' || payable.status === 'PAID') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.PAYABLE_NOT_OPEN,
        message: 'Utang tidak dapat menerima pembayaran.',
      });
    }

    const amountIdr = toIdrInteger(payable.amount);
    const paidSoFar = toIdrInteger(payable.paidAmount);
    const outstandingBefore = amountIdr - paidSoFar;
    if (dto.amount <= 0 || dto.amount > outstandingBefore) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: `Nominal pembayaran tidak valid. Sisa utang: ${outstandingBefore}.`,
      });
    }

    const newPaid = paidSoFar + dto.amount;
    let paymentId = '';
    let receiptNumber = '';
    let createdAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      receiptNumber = await this.paymentReceipt.nextReceiptNumber(tx, user.tenantId, 'PAY');
      const payment = await tx.payablePayment.create({
        data: {
          payableId,
          amount: idrToDecimal(dto.amount),
          method: dto.method,
          reference: dto.reference?.trim() || null,
          receiptNumber,
          recordedById: user.sub,
        },
      });
      paymentId = payment.id;
      createdAt = payment.createdAt;
      await tx.payable.update({
        where: { id: payableId },
        data: {
          paidAmount: idrToDecimal(newPaid),
          status: computePayableStatus(amountIdr, newPaid),
        },
      });
    });

    const [payableRow, storeName, recorder] = await Promise.all([
      this.getById(user, payableId),
      this.paymentReceipt.getTenantName(user.tenantId),
      this.prisma.user.findUnique({ where: { id: user.sub }, select: { fullName: true } }),
    ]);

    const receipt = this.paymentReceipt.buildReceiptView({
      kind: 'PAYABLE_PAYMENT',
      receiptNumber,
      amount: dto.amount,
      method: dto.method,
      createdAt,
      recordedByName: recorder?.fullName ?? 'Petugas',
      counterpartyName: payable.supplier.name,
      counterpartyPhone: payable.supplier.phone,
      storeName,
      outletName: payable.purchaseOrder?.outlet?.name ?? null,
      outstandingBefore,
      outstandingAfter: outstandingBefore - dto.amount,
      transferReference: dto.reference ?? null,
      notes: null,
      referenceLabel: payable.purchaseOrder?.orderNo ?? null,
      paymentId,
    });

    return { ...payableRow, receipt };
  }

  async listOverdue(user: AuthJwtPayload) {
    return this.list(user, { status: 'OVERDUE' });
  }

  private mapPayable(
    row: {
      id: string;
      supplierId: string;
      poId: string | null;
      amount: { toString(): string } | Decimal;
      paidAmount: { toString(): string } | Decimal;
      status: string;
      dueDate: Date | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
      supplier?: { id: string; name: string; phone?: string | null; email?: string | null };
      purchaseOrder?: { id: string; orderNo: string; status: string; receivedAt?: Date | null } | null;
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
      supplierId: row.supplierId,
      poId: row.poId,
      amount,
      paidAmount,
      outstanding: computeOutstanding(amount, paidAmount),
      status: row.status,
      computedStatus: computePayableStatus(amount, paidAmount, row.status === 'VOID'),
      isOverdue,
      dueDate: row.dueDate?.toISOString().slice(0, 10) ?? null,
      notes: row.notes,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      supplier: row.supplier,
      purchaseOrder: row.purchaseOrder
        ? {
            ...row.purchaseOrder,
            receivedAt: row.purchaseOrder.receivedAt?.toISOString() ?? null,
          }
        : undefined,
      payments:
        includePayments && row.payments
          ? row.payments.map((p) => ({
              id: p.id,
              amount: toIdrInteger(p.amount),
              method: p.method,
              reference: p.reference,
              receiptNumber: (p as { receiptNumber?: string | null }).receiptNumber ?? null,
              recordedBy: p.recordedBy,
              createdAt: p.createdAt.toISOString(),
            }))
          : undefined,
    };
  }
}
