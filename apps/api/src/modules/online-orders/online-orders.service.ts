import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { toIdrInteger } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { FulfillmentQueryDto } from './dto/fulfillment-query.dto';
import type { ManagerOrdersQueryDto } from './dto/manager-orders-query.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { MidtransNotification } from './midtrans.service';
import { MidtransService } from './midtrans.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  ALLOWED_STATUS_TRANSITIONS,
  formatDeliveryAddressSnippet,
  fulfillmentTypeLabel,
  orderStatusLabel,
} from './online-order.util';

@Injectable()
export class OnlineOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransService,
    private readonly realtime: RealtimeService,
  ) {}

  async listFulfillment(user: AuthJwtPayload, query: FulfillmentQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const statusFilter = (query.status ?? 'PAID,CONFIRMED,READY')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const where = {
      tenantId: user.tenantId,
      outletId,
      status: { in: statusFilter as never[] },
    };

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        statusLabel: orderStatusLabel(order.status),
        createdAt: order.createdAt.toISOString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        fulfillmentType: order.fulfillmentType,
        fulfillmentTypeLabel: fulfillmentTypeLabel(order.fulfillmentType),
        deliveryAddressSnippet: formatDeliveryAddressSnippet(order.deliveryAddress),
        shippingFee: toIdrInteger(order.shippingFee),
        total: toIdrInteger(order.total),
        itemCount: order.items.length,
        notes: order.customerNotes,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async listManagerOrders(user: AuthJwtPayload, query: ManagerOrdersQueryDto) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Hanya owner atau manager yang dapat melihat daftar pesanan manajemen.',
      });
    }

    await this.expirePendingOrders(user.tenantId);

    const outletId = resolveOutletId(user, query.outletId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const statusFilter = (query.status ?? 'PENDING_PAYMENT,PAID,CONFIRMED,READY,COMPLETED,CANCELLED,EXPIRED')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) {
      createdAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }

    const where = {
      tenantId: user.tenantId,
      outletId,
      status: { in: statusFilter as never[] },
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { orderNo: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { customerName: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { customerPhone: { contains: query.search.trim() } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    return {
      items: orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        statusLabel: orderStatusLabel(order.status),
        createdAt: order.createdAt.toISOString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        fulfillmentType: order.fulfillmentType,
        fulfillmentTypeLabel: fulfillmentTypeLabel(order.fulfillmentType),
        deliveryAddressSnippet: formatDeliveryAddressSnippet(order.deliveryAddress),
        shippingFee: toIdrInteger(order.shippingFee),
        total: toIdrInteger(order.total),
        itemCount: order.items.length,
        notes: order.customerNotes,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderDetail(user: AuthJwtPayload, orderId: string, outletId?: string) {
    const resolvedOutletId = resolveOutletId(user, outletId);
    const order = await this.prisma.onlineOrder.findFirst({
      where: {
        id: orderId,
        tenantId: user.tenantId,
        outletId: resolvedOutletId,
      },
      include: {
        items: true,
        outlet: true,
      },
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusLabel: orderStatusLabel(order.status),
      fulfillmentType: order.fulfillmentType,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerNotes: order.customerNotes,
      outlet: {
        id: order.outlet.id,
        name: order.outlet.name,
        address: order.outlet.address ?? '',
      },
      subtotal: toIdrInteger(order.subtotal),
      tax: toIdrInteger(order.tax),
      total: toIdrInteger(order.total),
      paidAt: order.paidAt?.toISOString() ?? null,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitPrice: toIdrInteger(item.unitPrice),
        subtotal: toIdrInteger(item.subtotal),
      })),
    };
  }

  async updateStatus(
    user: AuthJwtPayload,
    orderId: string,
    dto: UpdateOrderStatusDto,
    outletId?: string,
  ) {
    const resolvedOutletId = resolveOutletId(user, outletId);
    const order = await this.prisma.onlineOrder.findFirst({
      where: {
        id: orderId,
        tenantId: user.tenantId,
        outletId: resolvedOutletId,
      },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_STATUS_TRANSITION_INVALID,
        message: 'Perubahan status pesanan tidak diizinkan.',
      });
    }

    if (dto.status === 'CANCELLED' && user.role === UserRole.CASHIER) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Pembatalan order membutuhkan role Manager atau Owner.',
      });
    }

    const now = new Date();
    const updated = await this.prisma.onlineOrder.update({
      where: { id: order.id },
      data: {
        status: dto.status,
        completedAt: dto.status === 'COMPLETED' ? now : order.completedAt,
        cancelledAt: dto.status === 'CANCELLED' ? now : order.cancelledAt,
        cancelReason: dto.status === 'CANCELLED' ? dto.note?.trim() || 'Dibatalkan staff' : order.cancelReason,
      },
    });

    if (dto.status === 'COMPLETED') {
      await this.emitFulfillmentStockSnapshot(order);
    }

    this.emitOrderUpdated({
      id: updated.id,
      orderNo: updated.orderNo,
      outletId: order.outletId,
      tenantId: order.tenantId,
      status: updated.status,
    });

    return {
      id: updated.id,
      orderNo: updated.orderNo,
      status: updated.status,
      statusLabel: orderStatusLabel(updated.status),
    };
  }

  private emitOrderUpdated(order: { id: string; orderNo: string; outletId: string; tenantId: string; status: string }) {
    this.realtime.emitOnlineOrderUpdated({
      orderId: order.id,
      orderNo: order.orderNo,
      outletId: order.outletId,
      tenantId: order.tenantId,
      status: order.status,
    });
  }

  private async emitFulfillmentStockSnapshot(order: {
    id: string;
    outletId: string;
    tenantId: string;
    items: Array<{ productId: string }>;
  }) {
    const productIds = order.items.map((item) => item.productId);
    if (productIds.length === 0) {
      return;
    }
    const inventory = await this.prisma.inventoryItem.findMany({
      where: { outletId: order.outletId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    for (const row of inventory) {
      this.realtime.emitStockChanged({
        tenantId: order.tenantId,
        outletId: order.outletId,
        productId: row.productId,
        quantity: Number(row.quantity),
        type: 'ONLINE_FULFILLMENT',
      });
    }
  }

  private emitPaidStockMovements(
    order: { outletId: string; tenantId: string },
    stockUpdates: Array<{ productId: string; quantityAfter: number }>,
  ) {
    for (const row of stockUpdates) {
      this.realtime.emitStockChanged({
        tenantId: order.tenantId,
        outletId: order.outletId,
        productId: row.productId,
        quantity: row.quantityAfter,
        type: 'SALE_ONLINE',
      });
    }
  }

  async handleMidtransWebhook(notification: MidtransNotification) {
    const order = await this.prisma.onlineOrder.findFirst({
      where: { midtransOrderId: notification.order_id },
      include: { items: true, payments: true },
    });

    const tenantSettings = order
      ? await this.prisma.tenantSettings.findUnique({ where: { tenantId: order.tenantId } })
      : null;
    const midtransRuntime = {
      serverKey: tenantSettings?.midtransServerKey,
      isProduction: tenantSettings?.midtransIsProduction ?? undefined,
    };

    if (!this.midtrans.verifySignature(notification, midtransRuntime)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
        message: 'Verifikasi pembayaran gagal.',
      });
    }

    if (!order) {
      return { ok: true, message: 'Order not found — ignored' };
    }

    const transactionId = notification.transaction_id ?? notification.order_id;

    if (order.status === 'PAID') {
      return { ok: true, message: 'Already paid' };
    }

    const existingPayment = await this.prisma.onlineOrderPayment.findFirst({
      where: { midtransTransactionId: transactionId, status: 'PAID' },
    });
    if (existingPayment) {
      return { ok: true, message: 'Duplicate webhook' };
    }

    if (this.midtrans.isPaidNotification(notification)) {
      await this.markOrderPaid(order.id, notification, transactionId);
      return { ok: true, message: 'Paid' };
    }

    if (this.midtrans.isCancelledNotification(notification)) {
      await this.prisma.onlineOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: notification.transaction_status,
        },
      });
      return { ok: true, message: 'Cancelled' };
    }

    return { ok: true, message: 'Ignored' };
  }

  private async markOrderPaid(
    orderId: string,
    notification: MidtransNotification,
    transactionId: string,
  ) {
    const order = await this.prisma.onlineOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status === 'PAID') {
      return;
    }

    const actorId = await this.resolveSystemActorId(order.tenantId);
    const productIds = order.items.map((item) => item.productId);
    const inventory = await this.prisma.inventoryItem.findMany({
      where: { outletId: order.outletId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    const stockMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    for (const item of order.items) {
      const available = stockMap.get(item.productId) ?? 0;
      const quantity = Number(item.quantity);
      if (available < quantity) {
        throw new ConflictException({
          code: ErrorCodes.INSUFFICIENT_STOCK,
          message: 'Stok produk tidak mencukupi saat konfirmasi pembayaran.',
        });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const paidAt = new Date();
      await tx.onlineOrder.update({
        where: { id: order.id },
        data: { status: 'PAID', paidAt },
      });

      const pendingPayment = await tx.onlineOrderPayment.findFirst({
        where: { onlineOrderId: order.id, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
      });

      if (pendingPayment) {
        await tx.onlineOrderPayment.update({
          where: { id: pendingPayment.id },
          data: {
            status: 'PAID',
            midtransTransactionId: transactionId,
            paymentType: notification.payment_type ?? null,
            rawNotification: notification as object,
          },
        });
      } else {
        await tx.onlineOrderPayment.create({
          data: {
            onlineOrderId: order.id,
            status: 'PAID',
            amount: order.total,
            midtransTransactionId: transactionId,
            paymentType: notification.payment_type ?? null,
            rawNotification: notification as object,
          },
        });
      }

      for (const item of order.items) {
        const quantity = Number(item.quantity);
        const availableBefore = stockMap.get(item.productId) ?? 0;
        const quantityAfter = availableBefore - quantity;

        await tx.inventoryItem.update({
          where: {
            outletId_productId: {
              outletId: order.outletId,
              productId: item.productId,
            },
          },
          data: { quantity: new Decimal(quantityAfter) },
        });

        await tx.stockMovement.create({
          data: {
            outletId: order.outletId,
            productId: item.productId,
            type: 'SALE_ONLINE',
            quantity: new Decimal(quantity * -1),
            quantityBefore: new Decimal(availableBefore),
            quantityAfter: new Decimal(quantityAfter),
            referenceType: 'online_order',
            referenceId: order.id,
            notes: `Online order ${order.orderNo}`,
            createdById: actorId,
          },
        });

        stockMap.set(item.productId, quantityAfter);
      }
    });

    this.emitPaidStockMovements(
      order,
      order.items.map((item) => ({
        productId: item.productId,
        quantityAfter: stockMap.get(item.productId) ?? 0,
      })),
    );

    this.realtime.emitOnlineOrderPaid({
      orderId: order.id,
      orderNo: order.orderNo,
      outletId: order.outletId,
      tenantId: order.tenantId,
      status: 'PAID',
    });
  }

  private async resolveSystemActorId(tenantId: string): Promise<string> {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.OWNER, isActive: true },
      select: { id: true },
    });
    if (owner) return owner.id;

    const manager = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.MANAGER, isActive: true },
      select: { id: true },
    });
    if (manager) return manager.id;

    const anyUser = await this.prisma.user.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (!anyUser) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Tidak ada user sistem untuk audit stok.',
      });
    }
    return anyUser.id;
  }

  async expirePendingOrders(tenantId?: string) {
    const now = new Date();
    const result = await this.prisma.onlineOrder.updateMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['NEW', 'PENDING_PAYMENT'] },
        expiresAt: { lte: now },
      },
      data: {
        status: 'EXPIRED' as never,
        cancelledAt: now,
        cancelReason: 'Pesanan kedaluwarsa — TTL pembayaran habis.',
      },
    });
    return { expiredCount: result.count };
  }
}
