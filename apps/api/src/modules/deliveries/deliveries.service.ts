import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import type { DeliveryStatus, DeliveryType as PrismaDeliveryType } from '@barokah/database';
import {
  DELIVERY_STATUS_TRANSITIONS,
  DELIVERY_TYPE_LABELS,
  ErrorCodes,
  ONLINE_ORDER_CHANNEL_LABELS,
  type DeliveryAddressSnapshot,
  type DeliveryOrderDetail,
  type DeliveryOrderListItem,
  type DeliveryQueueSummary,
  type DeliveryType,
} from '@barokah/shared';

type DeliveryTypeValue = PrismaDeliveryType | DeliveryType;
import { PrismaService } from '../../common/database/prisma.service';
import { buildOutletWhere, resolveListOutletScope, resolveOutletId } from '../../common/utils/outlet.util';
import { CustomersService } from '../customers/customers.service';
import { toIdrInteger } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { CreateDeliveryOrderDto } from './dto/delivery.dto';
import type { CheckoutDeliveryFields } from '../transactions/dto/checkout-delivery.dto';
import type { DeliveryListQueryDto, DeliveryQueueSummaryQueryDto } from './dto/delivery-query.dto';
import type { UpdateDeliveryStatusDto } from './dto/delivery.dto';
import {
  buildDeliveryNo,
  deliveryStatusLabel,
  formatAddressSnippet,
  getJakartaDateKey,
} from './delivery.util';

type AddressFields = DeliveryAddressSnapshot & { addressId?: string | null };

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {}

  async list(user: AuthJwtPayload, query: DeliveryListQueryDto) {
    const outletScope = resolveListOutletScope(user, query.outletId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const statusFilter = (query.status ?? 'MENUNGGU,DISIAPKAN,DIKIRIM')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean) as DeliveryStatus[];

    const createdAt: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) {
      createdAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      const end = new Date(query.dateTo);
      end.setHours(23, 59, 59, 999);
      createdAt.lte = end;
    }

    const deliveryTypeFilter = query.deliveryType?.trim() as DeliveryTypeValue | undefined;

    const where = {
      tenantId: user.tenantId,
      ...buildOutletWhere(outletScope),
      status: { in: statusFilter },
      ...(deliveryTypeFilter ? { deliveryType: deliveryTypeFilter } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { deliveryNo: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { customer: { name: { contains: query.search.trim(), mode: 'insensitive' as const } } },
              { customer: { phone: { contains: query.search.trim() } } },
              { addressLine1: { contains: query.search.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [orders, total] = await Promise.all([
      this.prisma.deliveryOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          outlet: { select: { id: true, name: true } },
          onlineOrder: { select: { id: true, orderNo: true, channel: true, externalOrderRef: true, items: { select: { productName: true, quantity: true, subtotal: true } } } },
          transaction: {
            select: {
              id: true,
              receiptNo: true,
              total: true,
              items: { select: { id: true } },
            },
          },
        },
      }),
      this.prisma.deliveryOrder.count({ where }),
    ]);

    return {
      items: orders.map((order) => this.toListItem(order)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(user: AuthJwtPayload, id: string, outletIdParam?: string) {
    const outletId = resolveOutletId(user, outletIdParam);
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { id, tenantId: user.tenantId, outletId },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, name: true } },
        onlineOrder: {
          select: {
            id: true,
            orderNo: true,
            items: {
              select: {
                productName: true,
                quantity: true,
                subtotal: true,
              },
            },
          },
        },
        transaction: {
          select: {
            id: true,
            receiptNo: true,
            total: true,
            items: {
              select: {
                productName: true,
                quantity: true,
                sellUnitSymbol: true,
                subtotal: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { changedBy: { select: { fullName: true } } },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.DELIVERY_NOT_FOUND,
        message: 'Pesanan pengiriman tidak ditemukan.',
      });
    }

    return this.toDetail(order);
  }

  async createForCompletedTransaction(
    user: AuthJwtPayload,
    params: {
      transactionId: string;
      outletId: string;
      customerId: string | null;
      delivery: Pick<
        CheckoutDeliveryFields,
        | 'deliveryRequired'
        | 'deliveryAddressId'
        | 'deliveryAddressSnapshot'
        | 'deliveryNotes'
        | 'customerName'
        | 'customerPhone'
      >;
    },
  ): Promise<{ deliveryNo: string } | { error: string } | null> {
    if (!params.delivery.deliveryRequired) {
      return null;
    }

    const existing = await this.prisma.deliveryOrder.findFirst({
      where: { transactionId: params.transactionId, tenantId: user.tenantId },
      select: { deliveryNo: true },
    });
    if (existing) {
      return { deliveryNo: existing.deliveryNo };
    }

    try {
      const created = await this.create(user, {
        transactionId: params.transactionId,
        outletId: params.outletId,
        customerId: params.customerId ?? undefined,
        customerName: params.delivery.customerName,
        customerPhone: params.delivery.customerPhone,
        addressId: params.delivery.deliveryAddressId,
        addressSnapshot: params.delivery.deliveryAddressSnapshot,
        notes: params.delivery.deliveryNotes,
        deliveryType: 'STORE_DIRECT',
      });
      return { deliveryNo: created.deliveryNo };
    } catch (error) {
      const response =
        error && typeof error === 'object' && 'getResponse' in error
          ? (error as { getResponse: () => unknown }).getResponse()
          : null;
      const message =
        response && typeof response === 'object' && response !== null && 'message' in response
          ? String((response as { message: unknown }).message)
          : 'Pengiriman gagal dibuat.';
      return { error: message };
    }
  }

  async create(user: AuthJwtPayload, dto: CreateDeliveryOrderDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    let customerId = dto.customerId;
    let transaction:
      | {
          id: string;
          customerId: string | null;
          outletId: string;
          status: string;
        }
      | null = null;

    if (dto.transactionId) {
      transaction = await this.prisma.transaction.findFirst({
        where: {
          id: dto.transactionId,
          outletId,
          outlet: { tenantId: user.tenantId },
        },
        select: { id: true, customerId: true, outletId: true, status: true },
      });

      if (!transaction) {
        throw new NotFoundException({
          code: ErrorCodes.DELIVERY_TRANSACTION_NOT_FOUND,
          message: 'Transaksi tidak ditemukan untuk outlet ini.',
        });
      }

      if (transaction.status !== 'COMPLETED') {
        throw new UnprocessableEntityException({
          code: ErrorCodes.DELIVERY_TRANSACTION_NOT_FOUND,
          message: 'Hanya transaksi selesai yang dapat dibuatkan pengiriman.',
        });
      }

      const existing = await this.prisma.deliveryOrder.findFirst({
        where: { transactionId: dto.transactionId, tenantId: user.tenantId },
      });
      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.DELIVERY_ALREADY_EXISTS,
          message: `Pengiriman sudah ada untuk transaksi ini (${existing.deliveryNo}).`,
        });
      }

      customerId = transaction.customerId ?? dto.customerId;
    }

    if (!customerId) {
      const resolvedCustomerId = await this.customersService.resolveOptionalCustomerId(user.tenantId, {
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
      });
      if (resolvedCustomerId) {
        customerId = resolvedCustomerId;
      }
    }

    if (!customerId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_CUSTOMER_REQUIRED,
        message: 'Pelanggan wajib dipilih untuk pengiriman.',
      });
    }

    await this.assertCustomer(user.tenantId, customerId);
    const addressFields = await this.resolveAddress(user.tenantId, customerId, dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const dateKey = getJakartaDateKey();
      const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);
      const sequence = await tx.deliveryOrderSequence.upsert({
        where: { tenantId_sequenceDate: { tenantId: user.tenantId, sequenceDate } },
        create: { tenantId: user.tenantId, sequenceDate, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const deliveryNo = buildDeliveryNo(dateKey, sequence.lastValue);

      const deliveryType = (dto.deliveryType ?? 'STORE_DIRECT') as DeliveryTypeValue;

      const order = await tx.deliveryOrder.create({
        data: {
          tenantId: user.tenantId,
          outletId,
          deliveryNo,
          deliveryType,
          transactionId: dto.transactionId ?? null,
          customerId,
          addressId: addressFields.addressId ?? null,
          addressLabel: addressFields.label,
          addressLine1: addressFields.addressLine1,
          addressLine2: addressFields.addressLine2 ?? null,
          addressCity: addressFields.city,
          addressProvince: addressFields.province ?? null,
          addressPostalCode: addressFields.postalCode ?? null,
          status: 'MENUNGGU',
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
          driverName: dto.driverName?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdById: user.sub,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: 'MENUNGGU',
              notes: dto.notes?.trim() || 'Masuk antrian pengiriman',
              changedById: user.sub,
            },
          },
        },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          outlet: { select: { id: true, name: true } },
          onlineOrder: { select: { id: true, orderNo: true, channel: true, externalOrderRef: true, items: { select: { productName: true, quantity: true, subtotal: true } } } },
          transaction: {
            select: {
              id: true,
              receiptNo: true,
              total: true,
              items: { select: { id: true } },
            },
          },
        },
      });

      return order;
    });

    return this.toListItem(created);
  }

  async updateStatus(
    user: AuthJwtPayload,
    id: string,
    dto: UpdateDeliveryStatusDto,
    outletIdParam?: string,
  ) {
    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Hanya owner atau manager yang dapat mengubah status pengiriman.',
      });
    }

    const outletId = resolveOutletId(user, outletIdParam);
    const nextStatus = dto.status as DeliveryStatus;
    const order = await this.prisma.deliveryOrder.findFirst({
      where: { id, tenantId: user.tenantId, outletId },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCodes.DELIVERY_NOT_FOUND,
        message: 'Pesanan pengiriman tidak ditemukan.',
      });
    }

    const allowed = DELIVERY_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_STATUS_TRANSITION_INVALID,
        message: `Status tidak dapat diubah dari ${deliveryStatusLabel(order.status)} ke ${deliveryStatusLabel(nextStatus)}.`,
      });
    }

    if (nextStatus === 'BATAL' && !dto.cancelReason?.trim()) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DELIVERY_CANCEL_REASON_REQUIRED,
        message: 'Alasan pembatalan wajib diisi.',
      });
    }

    const updated = await this.prisma.deliveryOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        driverName: dto.driverName?.trim() ?? order.driverName,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : order.scheduledAt,
        notes: dto.notes?.trim() ?? order.notes,
        cancelReason: nextStatus === 'BATAL' ? dto.cancelReason?.trim() ?? null : order.cancelReason,
        statusHistory: {
          create: {
            fromStatus: order.status,
            toStatus: nextStatus,
            notes: dto.notes?.trim() || dto.cancelReason?.trim() || null,
            changedById: user.sub,
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, name: true } },
        onlineOrder: { select: { id: true, orderNo: true, channel: true, externalOrderRef: true, items: { select: { productName: true, quantity: true, subtotal: true } } } },
        transaction: {
          select: {
            id: true,
            receiptNo: true,
            total: true,
            items: { select: { id: true } },
          },
        },
      },
    });

    return this.toListItem(updated);
  }

  async queueSummary(user: AuthJwtPayload, query: DeliveryQueueSummaryQueryDto): Promise<DeliveryQueueSummary> {
    const outletScope = resolveListOutletScope(user, query.outletId);
    const rows = await this.prisma.deliveryOrder.groupBy({
      by: ['status'],
      where: {
        tenantId: user.tenantId,
        ...buildOutletWhere(outletScope),
        status: { in: ['MENUNGGU', 'DISIAPKAN', 'DIKIRIM', 'SELESAI', 'BATAL'] },
      },
      _count: { _all: true },
    });

    const summary: DeliveryQueueSummary = {
      MENUNGGU: 0,
      DISIAPKAN: 0,
      DIKIRIM: 0,
      SELESAI: 0,
      BATAL: 0,
      total: 0,
    };

    for (const row of rows) {
      summary[row.status] = row._count._all;
      summary.total += row._count._all;
    }

    return summary;
  }

  private async assertCustomer(tenantId: string, customerId: string) {
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

  private async resolveAddress(
    tenantId: string,
    customerId: string,
    dto: CreateDeliveryOrderDto,
  ): Promise<AddressFields> {
    if (dto.addressId) {
      const address = await this.prisma.customerAddress.findFirst({
        where: { id: dto.addressId, customerId, customer: { tenantId } },
      });
      if (!address) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Alamat pelanggan tidak ditemukan.',
        });
      }
      return {
        addressId: address.id,
        label: address.label,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
      };
    }

    if (dto.addressSnapshot) {
      return {
        label: dto.addressSnapshot.label.trim(),
        addressLine1: dto.addressSnapshot.addressLine1.trim(),
        addressLine2: dto.addressSnapshot.addressLine2?.trim() || null,
        city: dto.addressSnapshot.city.trim(),
        province: dto.addressSnapshot.province?.trim() || null,
        postalCode: dto.addressSnapshot.postalCode?.trim() || null,
      };
    }

    throw new UnprocessableEntityException({
      code: ErrorCodes.DELIVERY_ADDRESS_REQUIRED,
      message: 'Pilih alamat pelanggan atau isi alamat pengiriman.',
    });
  }

  private toListItem(order: {
    id: string;
    deliveryNo: string;
    deliveryType: DeliveryTypeValue;
    status: DeliveryStatus;
    createdAt: Date;
    scheduledAt: Date | null;
    driverName: string | null;
    notes: string | null;
    addressLine1: string;
    addressLine2: string | null;
    addressCity: string;
    addressProvince: string | null;
    customer: { id: string; name: string; phone: string };
    outlet: { id: string; name: string };
    onlineOrder: { id: string; orderNo: string; channel?: string; externalOrderRef?: string | null; items: Array<{ productName: string; quantity: { toString(): string }; subtotal: { toString(): string } }> } | null;
    transaction: {
      id: string;
      receiptNo: string;
      total: { toString(): string };
      items: Array<{ id: string }>;
    } | null;
  }): DeliveryOrderListItem {
    const onlineItemCount = order.onlineOrder?.items.length ?? 0;
    return {
      id: order.id,
      deliveryNo: order.deliveryNo,
      deliveryType: order.deliveryType,
      deliveryTypeLabel: DELIVERY_TYPE_LABELS[order.deliveryType],
      status: order.status,
      statusLabel: deliveryStatusLabel(order.status),
      createdAt: order.createdAt.toISOString(),
      scheduledAt: order.scheduledAt?.toISOString() ?? null,
      driverName: order.driverName,
      notes: order.notes,
      customer: order.customer,
      addressSnippet: formatAddressSnippet({
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.addressCity,
        province: order.addressProvince,
      }),
      outlet: order.outlet,
      transaction: order.transaction
        ? {
            id: order.transaction.id,
            receiptNo: order.transaction.receiptNo,
            total: toIdrInteger(order.transaction.total),
          }
        : null,
      onlineOrder: order.onlineOrder
        ? {
            id: order.onlineOrder.id,
            orderNo: order.onlineOrder.orderNo,
            ...(order.onlineOrder.channel
              ? {
                  channel: order.onlineOrder.channel as never,
                  channelLabel: ONLINE_ORDER_CHANNEL_LABELS[order.onlineOrder.channel as keyof typeof ONLINE_ORDER_CHANNEL_LABELS],
                }
              : {}),
            externalOrderRef: order.onlineOrder.externalOrderRef ?? null,
          }
        : null,
      itemCount: order.transaction?.items.length ?? onlineItemCount,
    };
  }

  private toDetail(order: {
    id: string;
    deliveryNo: string;
    deliveryType: DeliveryTypeValue;
    status: DeliveryStatus;
    createdAt: Date;
    scheduledAt: Date | null;
    driverName: string | null;
    notes: string | null;
    cancelReason: string | null;
    addressLabel: string;
    addressLine1: string;
    addressLine2: string | null;
    addressCity: string;
    addressProvince: string | null;
    addressPostalCode: string | null;
    customer: { id: string; name: string; phone: string };
    outlet: { id: string; name: string };
    onlineOrder: {
      id: string;
      orderNo: string;
      items: Array<{
        productName: string;
        quantity: { toString(): string };
        subtotal: { toString(): string };
      }>;
    } | null;
    transaction: {
      id: string;
      receiptNo: string;
      total: { toString(): string };
      items: Array<{
        productName: string;
        quantity: { toString(): string };
        sellUnitSymbol: string | null;
        subtotal: { toString(): string };
      }>;
    } | null;
    statusHistory: Array<{
      id: string;
      fromStatus: DeliveryStatus | null;
      toStatus: DeliveryStatus;
      notes: string | null;
      createdAt: Date;
      changedBy: { fullName: string };
    }>;
  }): DeliveryOrderDetail {
    const onlineItems =
      order.onlineOrder?.items.map((item) => ({
        productName: item.productName,
        quantity: Number(item.quantity),
        sellUnitSymbol: null as string | null,
        subtotal: toIdrInteger(item.subtotal),
      })) ?? [];

    const listItem = this.toListItem({
      ...order,
      transaction: order.transaction
        ? {
            ...order.transaction,
            items: order.transaction.items.map((item, index) => ({ id: String(index) })),
          }
        : null,
    });

    return {
      ...listItem,
      itemCount: order.transaction?.items.length ?? onlineItems.length,
      address: {
        label: order.addressLabel,
        addressLine1: order.addressLine1,
        addressLine2: order.addressLine2,
        city: order.addressCity,
        province: order.addressProvince,
        postalCode: order.addressPostalCode,
      },
      cancelReason: order.cancelReason,
      items:
        order.transaction?.items.map((item) => ({
          productName: item.productName,
          quantity: Number(item.quantity),
          sellUnitSymbol: item.sellUnitSymbol,
          subtotal: toIdrInteger(item.subtotal),
        })) ?? onlineItems,
      statusHistory: order.statusHistory.map((log) => ({
        id: log.id,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        fromStatusLabel: log.fromStatus ? deliveryStatusLabel(log.fromStatus) : null,
        toStatusLabel: deliveryStatusLabel(log.toStatus),
        notes: log.notes,
        changedByName: log.changedBy.fullName,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }
}
