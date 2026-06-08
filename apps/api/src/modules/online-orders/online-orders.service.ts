import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import type { Prisma, DeliveryStatus } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { toIdrInteger, idrToDecimal } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { FulfillmentQueryDto } from './dto/fulfillment-query.dto';
import type { CreateMarketplaceOrderDto } from './dto/create-marketplace-order.dto';
import type { ManagerOrdersQueryDto } from './dto/manager-orders-query.dto';
import type { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import type { MidtransNotification } from './midtrans.service';
import { MidtransService } from './midtrans.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CustomersService } from '../customers/customers.service';
import { buildDeliveryNo, deliveryStatusLabel, getJakartaDateKey } from '../deliveries/delivery.util';
import {
  formatOnlineDeliveryAddressFull,
  mapOnlineAddressToDeliveryFields,
  targetDeliveryStatusForOnlineOrder,
} from './online-order-delivery.util';
import {
  ALLOWED_STATUS_TRANSITIONS,
  buildMarketplaceOrderNo,
  formatDeliveryAddressSnippet,
  fulfillmentTypeLabel,
  normalizePhone,
  onlineOrderChannelLabel,
  orderStatusLabel,
} from './online-order.util';

@Injectable()
export class OnlineOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransService,
    private readonly realtime: RealtimeService,
    private readonly customersService: CustomersService,
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
    const channelFilter = query.channel
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const where = {
      tenantId: user.tenantId,
      outletId,
      status: { in: statusFilter as never[] },
      ...(channelFilter && channelFilter.length > 0 ? { channel: { in: channelFilter as never[] } } : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.onlineOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { items: true, deliveryOrder: { select: { id: true, deliveryNo: true, status: true } } },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.mapFulfillmentOrder(order)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private mapFulfillmentOrder(order: {
    id: string;
    orderNo: string;
    channel: string;
    externalOrderRef: string | null;
    status: string;
    createdAt: Date;
    customerName: string;
    customerPhone: string;
    fulfillmentType: string;
    deliveryAddress: unknown;
    shippingFee: { toString(): string };
    total: { toString(): string };
    customerNotes: string | null;
    items: Array<{ productName: string; quantity: { toString(): string }; sku: string }>;
    deliveryOrder: { id: string; deliveryNo: string; status: DeliveryStatus } | null;
  }) {
    return {
      id: order.id,
      orderNo: order.orderNo,
      channel: order.channel,
      channelLabel: onlineOrderChannelLabel(order.channel as never),
      externalOrderRef: order.externalOrderRef,
      status: order.status,
      statusLabel: orderStatusLabel(order.status as never),
      createdAt: order.createdAt.toISOString(),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      fulfillmentType: order.fulfillmentType,
      fulfillmentTypeLabel: fulfillmentTypeLabel(order.fulfillmentType as 'PICKUP' | 'DELIVERY'),
      deliveryAddressSnippet: formatDeliveryAddressSnippet(order.deliveryAddress),
      deliveryAddressFull: formatOnlineDeliveryAddressFull(order.deliveryAddress),
      shippingFee: toIdrInteger(order.shippingFee),
      total: toIdrInteger(order.total),
      itemCount: order.items.length,
      notes: order.customerNotes,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        sku: item.sku,
      })),
      delivery: order.deliveryOrder
        ? {
            id: order.deliveryOrder.id,
            deliveryNo: order.deliveryOrder.deliveryNo,
            status: order.deliveryOrder.status,
            statusLabel: deliveryStatusLabel(order.deliveryOrder.status),
          }
        : null,
    };
  }

  async createMarketplaceOrder(user: AuthJwtPayload, dto: CreateMarketplaceOrderDto) {
    const outletId = resolveOutletId(user, dto.outletId);

    const existing = await this.prisma.onlineOrder.findUnique({
      where: {
        tenantId_clientRequestId: {
          tenantId: user.tenantId,
          clientRequestId: dto.clientRequestId,
        },
      },
      include: { items: true, deliveryOrder: { select: { id: true, deliveryNo: true, status: true } } },
    });
    if (existing) {
      return this.mapFulfillmentOrder(existing);
    }

    const duplicateRef = await this.prisma.onlineOrder.findFirst({
      where: {
        tenantId: user.tenantId,
        channel: dto.channel,
        externalOrderRef: dto.externalOrderRef.trim(),
        status: { notIn: ['CANCELLED', 'EXPIRED'] },
      },
      select: { id: true, orderNo: true },
    });
    if (duplicateRef) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: `Order marketplace ${dto.externalOrderRef.trim()} sudah tercatat (${duplicateRef.orderNo}).`,
      });
    }

    if (dto.fulfillmentType === 'DELIVERY' && !dto.deliveryAddress) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_ADDRESS_REQUIRED,
        message: 'Alamat pengiriman wajib untuk order antar.',
      });
    }

    const mergedItems = dto.items.reduce<Map<string, number>>((acc, item) => {
      acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
      return acc;
    }, new Map());
    const productIds = [...mergedItems.keys()];

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
        isActive: true,
        hasVariants: false,
      },
      select: { id: true, name: true, sku: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        throw new NotFoundException({
          code: ErrorCodes.ONLINE_PRODUCT_NOT_AVAILABLE,
          message: 'Produk tidak ditemukan atau tidak aktif.',
        });
      }
    }

    const inventory = await this.prisma.inventoryItem.findMany({
      where: { outletId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    const stockMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    const stockIssues: Array<{ productId: string; name: string; requested: number; available: number }> = [];
    for (const [productId, quantity] of mergedItems) {
      const available = stockMap.get(productId) ?? 0;
      if (quantity > available) {
        stockIssues.push({
          productId,
          name: productMap.get(productId)!.name,
          requested: quantity,
          available,
        });
      }
    }
    if (stockIssues.length > 0) {
      throw new ConflictException({
        code: ErrorCodes.INSUFFICIENT_STOCK,
        message: 'Stok produk tidak mencukupi.',
        details: stockIssues.map((issue) => ({
          field: `items.${issue.productId}`,
          message: `${issue.name}: butuh ${issue.requested}, ada ${issue.available}.`,
        })),
      });
    }

    let subtotal = 0;
    const lineItems = productIds.map((productId) => {
      const product = productMap.get(productId)!;
      const quantity = mergedItems.get(productId) as number;
      const unitPrice = toIdrInteger(product.price);
      const lineSubtotal = unitPrice * quantity;
      subtotal += lineSubtotal;
      return {
        productId,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineSubtotal,
      };
    });

    const shippingFee = dto.fulfillmentType === 'DELIVERY' ? 0 : 0;
    const total = subtotal + shippingFee;
    const deliveryAddress =
      dto.fulfillmentType === 'DELIVERY' && dto.deliveryAddress
        ? {
            street: dto.deliveryAddress.street.trim(),
            district: dto.deliveryAddress.district.trim(),
            city: dto.deliveryAddress.city.trim(),
            ...(dto.deliveryAddress.postalCode?.trim()
              ? { postalCode: dto.deliveryAddress.postalCode.trim() }
              : {}),
          }
        : null;

    const normalizedPhone = normalizePhone(dto.customerPhone);
    const customer = await this.customersService.findOrCreateByPhone(
      user.tenantId,
      dto.customerName,
      dto.customerPhone,
    );
    const dateKey = getJakartaDateKey();
    const actorId = user.sub;

    const created = await this.prisma.$transaction(async (tx) => {
      const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);
      const sequence = await tx.onlineOrderSequence.upsert({
        where: {
          tenantId_sequenceDate: { tenantId: user.tenantId, sequenceDate },
        },
        create: { tenantId: user.tenantId, sequenceDate, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const orderNo = buildMarketplaceOrderNo(dto.channel, dateKey, sequence.lastValue);
      const paidAt = new Date();

      const order = await tx.onlineOrder.create({
        data: {
          tenantId: user.tenantId,
          outletId,
          orderNo,
          clientRequestId: dto.clientRequestId,
          channel: dto.channel,
          externalOrderRef: dto.externalOrderRef.trim(),
          status: 'PAID',
          paidAt,
          fulfillmentType: dto.fulfillmentType,
          customerId: customer.id,
          customerName: dto.customerName.trim(),
          customerPhone: normalizedPhone,
          customerNotes: dto.customerNotes?.trim() || null,
          subtotal: idrToDecimal(subtotal),
          tax: idrToDecimal(0),
          shippingFee: idrToDecimal(shippingFee),
          total: idrToDecimal(total),
          ...(deliveryAddress ? { deliveryAddress } : {}),
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: new Decimal(item.quantity),
              unitPrice: idrToDecimal(item.unitPrice),
              subtotal: idrToDecimal(item.lineSubtotal),
            })),
          },
          payments: {
            create: {
              status: 'PAID',
              amount: idrToDecimal(total),
              paymentType: `MARKETPLACE_${dto.channel}`,
            },
          },
        },
        include: { items: true, deliveryOrder: { select: { id: true, deliveryNo: true, status: true } } },
      });

      await this.deductStockForOnlineOrder(tx, order, actorId, stockMap);
      return order;
    });

    this.emitPaidStockMovements(
      created,
      created.items.map((item) => ({
        productId: item.productId,
        quantityAfter: stockMap.get(item.productId) ?? 0,
      })),
    );

    this.realtime.emitOnlineOrderPaid({
      orderId: created.id,
      orderNo: created.orderNo,
      outletId: created.outletId,
      tenantId: created.tenantId,
      status: 'PAID',
    });

    return this.mapFulfillmentOrder(created);
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
        include: { items: true, deliveryOrder: { select: { id: true, deliveryNo: true, status: true } } },
      }),
      this.prisma.onlineOrder.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.mapFulfillmentOrder(order)),
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
        tenant: { select: { name: true } },
        deliveryOrder: { select: { id: true, deliveryNo: true, status: true } },
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
      deliveryAddress: order.deliveryAddress,
      deliveryAddressFull: formatOnlineDeliveryAddressFull(order.deliveryAddress),
      shippingFee: toIdrInteger(order.shippingFee),
      tenantName: order.tenant.name,
      outlet: {
        id: order.outlet.id,
        name: order.outlet.name,
        address: order.outlet.address ?? '',
        phone: order.outlet.phone ?? null,
      },
      delivery: order.deliveryOrder
        ? {
            id: order.deliveryOrder.id,
            deliveryNo: order.deliveryOrder.deliveryNo,
            status: order.deliveryOrder.status,
            statusLabel: deliveryStatusLabel(order.deliveryOrder.status),
          }
        : null,
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
      include: { items: true, deliveryOrder: true },
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
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.onlineOrder.update({
        where: { id: order.id },
        data: {
          status: dto.status,
          completedAt: dto.status === 'COMPLETED' ? now : order.completedAt,
          cancelledAt: dto.status === 'CANCELLED' ? now : order.cancelledAt,
          cancelReason: dto.status === 'CANCELLED' ? dto.note?.trim() || 'Dibatalkan staff' : order.cancelReason,
        },
      });

      if (order.fulfillmentType === 'DELIVERY') {
        if (dto.status === 'CANCELLED') {
          await this.cancelDeliveryInTransaction(tx, user, order, dto.note);
        } else {
          await this.syncDeliveryInTransaction(tx, user, order, dto.status);
        }
      }

      return saved;
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

  async shipOrder(user: AuthJwtPayload, orderId: string, outletId?: string) {
    const resolvedOutletId = resolveOutletId(user, outletId);
    const order = await this.prisma.onlineOrder.findFirst({
      where: {
        id: orderId,
        tenantId: user.tenantId,
        outletId: resolvedOutletId,
        fulfillmentType: 'DELIVERY',
        status: 'READY',
      },
      include: { deliveryOrder: true },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan pengiriman siap kirim tidak ditemukan.',
      });
    }

    if (!order.deliveryOrder) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_NOT_FOUND,
        message: 'Antrian pengiriman belum dibuat. Tandai disiapkan terlebih dahulu.',
      });
    }

    if (order.deliveryOrder.status === 'DIKIRIM' || order.deliveryOrder.status === 'SELESAI') {
      return {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        statusLabel: orderStatusLabel(order.status),
        delivery: {
          id: order.deliveryOrder.id,
          deliveryNo: order.deliveryOrder.deliveryNo,
          status: order.deliveryOrder.status,
          statusLabel: deliveryStatusLabel(order.deliveryOrder.status),
        },
      };
    }

    const updatedDelivery = await this.prisma.deliveryOrder.update({
      where: { id: order.deliveryOrder.id },
      data: {
        status: 'DIKIRIM',
        statusHistory: {
          create: {
            fromStatus: order.deliveryOrder.status,
            toStatus: 'DIKIRIM',
            notes: `Order online ${order.orderNo} dikirim`,
            changedById: user.sub,
          },
        },
      },
    });

    this.realtime.emitDeliveryUpdated({
      deliveryId: updatedDelivery.id,
      deliveryNo: updatedDelivery.deliveryNo,
      outletId: order.outletId,
      tenantId: order.tenantId,
      status: updatedDelivery.status,
    });

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      statusLabel: orderStatusLabel(order.status),
      delivery: {
        id: updatedDelivery.id,
        deliveryNo: updatedDelivery.deliveryNo,
        status: updatedDelivery.status,
        statusLabel: deliveryStatusLabel(updatedDelivery.status),
      },
    };
  }

  async getShippingLabel(user: AuthJwtPayload, orderId: string, outletId?: string) {
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
        tenant: { select: { name: true, contactPhone: true } },
        deliveryOrder: { select: { id: true, deliveryNo: true, status: true } },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }

    if (order.fulfillmentType !== 'DELIVERY') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Label pengiriman hanya untuk order antar ke alamat.',
      });
    }

    return {
      orderNo: order.orderNo,
      orderDate: order.createdAt.toISOString(),
      serviceName: 'Pengiriman Toko (Store Direct)',
      deliveryTypeLabel: onlineOrderChannelLabel(order.channel),
      from: {
        storeName: order.tenant.name,
        outletName: order.outlet.name,
        address: order.outlet.address ?? '',
        phone: order.outlet.phone ?? order.tenant.contactPhone ?? null,
      },
      to: {
        name: order.customerName,
        phone: order.customerPhone,
        address: formatOnlineDeliveryAddressFull(order.deliveryAddress) ?? '',
      },
      delivery: order.deliveryOrder
        ? {
            deliveryNo: order.deliveryOrder.deliveryNo,
            status: order.deliveryOrder.status,
            statusLabel: deliveryStatusLabel(order.deliveryOrder.status),
          }
        : null,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        sku: item.sku,
      })),
      notes: order.customerNotes,
    };
  }

  private async cancelDeliveryInTransaction(
    tx: Prisma.TransactionClient,
    user: AuthJwtPayload,
    order: {
      orderNo: string;
      deliveryOrder: { id: string; status: string } | null;
    },
    cancelNote?: string,
  ) {
    if (!order.deliveryOrder) {
      return;
    }
    if (order.deliveryOrder.status === 'BATAL' || order.deliveryOrder.status === 'SELESAI') {
      return;
    }
    const reason = cancelNote?.trim() || `Order online ${order.orderNo} dibatalkan`;
    await tx.deliveryOrder.update({
      where: { id: order.deliveryOrder.id },
      data: {
        status: 'BATAL',
        cancelReason: reason,
        statusHistory: {
          create: {
            fromStatus: order.deliveryOrder.status as never,
            toStatus: 'BATAL',
            notes: reason,
            changedById: user.sub,
          },
        },
      },
    });
  }

  private async syncDeliveryInTransaction(
    tx: Prisma.TransactionClient,
    user: AuthJwtPayload,
    order: {
      id: string;
      tenantId: string;
      outletId: string;
      orderNo: string;
      customerId: string | null;
      customerName: string;
      customerPhone: string;
      customerNotes: string | null;
      deliveryAddress: unknown;
      deliveryOrder: { id: string; status: string } | null;
    },
    nextOrderStatus: string,
  ) {
    const targetStatus = targetDeliveryStatusForOnlineOrder(nextOrderStatus);
    if (!targetStatus) {
      return;
    }

    if (order.deliveryOrder) {
      if (order.deliveryOrder.status === targetStatus) {
        return;
      }
      const allowed = this.canAdvanceDeliveryStatus(order.deliveryOrder.status, targetStatus);
      if (!allowed) {
        return;
      }
      await tx.deliveryOrder.update({
        where: { id: order.deliveryOrder.id },
        data: {
          status: targetStatus,
          statusHistory: {
            create: {
              fromStatus: order.deliveryOrder.status as never,
              toStatus: targetStatus,
              notes: `Sinkron order online ${order.orderNo}`,
              changedById: user.sub,
            },
          },
        },
      });
      return;
    }

    if (nextOrderStatus === 'CONFIRMED' || nextOrderStatus === 'READY') {
      const createStatus = targetStatus as Extract<DeliveryStatus, 'MENUNGGU' | 'DISIAPKAN' | 'DIKIRIM' | 'SELESAI'>;
      await this.createDeliveryForOnlineOrder(tx, user, order, createStatus);
    }
  }

  private canAdvanceDeliveryStatus(current: string, target: string): boolean {
    const order = ['MENUNGGU', 'DISIAPKAN', 'DIKIRIM', 'SELESAI'];
    return order.indexOf(target) >= order.indexOf(current);
  }

  private async createDeliveryForOnlineOrder(
    tx: Prisma.TransactionClient,
    user: AuthJwtPayload,
    order: {
      id: string;
      tenantId: string;
      outletId: string;
      orderNo: string;
      customerId: string | null;
      customerName: string;
      customerPhone: string;
      customerNotes: string | null;
      deliveryAddress: unknown;
    },
    initialStatus: Extract<DeliveryStatus, 'MENUNGGU' | 'DISIAPKAN' | 'DIKIRIM' | 'SELESAI'>,
  ) {
    const addressFields = mapOnlineAddressToDeliveryFields(order.deliveryAddress);
    if (!addressFields) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_ADDRESS_REQUIRED,
        message: 'Alamat pengiriman order online tidak lengkap.',
      });
    }

    let customerId = order.customerId;
    if (!customerId) {
      const customer = await this.customersService.findOrCreateByPhone(
        order.tenantId,
        order.customerName,
        order.customerPhone,
      );
      customerId = customer.id;
      await tx.onlineOrder.update({
        where: { id: order.id },
        data: { customerId },
      });
    }

    const dateKey = getJakartaDateKey();
    const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);
    const sequence = await tx.deliveryOrderSequence.upsert({
      where: { tenantId_sequenceDate: { tenantId: order.tenantId, sequenceDate } },
      create: { tenantId: order.tenantId, sequenceDate, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    const deliveryNo = buildDeliveryNo(dateKey, sequence.lastValue);

    await tx.deliveryOrder.create({
      data: {
        tenantId: order.tenantId,
        outletId: order.outletId,
        deliveryNo,
        deliveryType: 'ONLINE_ORDER',
        onlineOrderId: order.id,
        customerId,
        addressLabel: addressFields.label,
        addressLine1: addressFields.addressLine1,
        addressLine2: addressFields.addressLine2,
        addressCity: addressFields.city,
        addressProvince: addressFields.province,
        addressPostalCode: addressFields.postalCode,
        status: initialStatus,
        notes: order.customerNotes?.trim() || `Order online ${order.orderNo}`,
        createdById: user.sub,
        statusHistory: {
          create: {
            fromStatus: null,
            toStatus: initialStatus,
            notes: `Dibuat dari order online ${order.orderNo}`,
            changedById: user.sub,
          },
        },
      },
    });
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

      await this.deductStockForOnlineOrder(tx, order, actorId, stockMap);
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

  private async deductStockForOnlineOrder(
    tx: Prisma.TransactionClient,
    order: {
      id: string;
      outletId: string;
      orderNo: string;
      items: Array<{ productId: string; quantity: { toString(): string } }>;
    },
    actorId: string,
    stockMap: Map<string, number>,
  ) {
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
