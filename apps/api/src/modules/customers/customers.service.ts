import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  computeLoyaltyPointsEarned,
  computeLoyaltyRedeemDiscount,
  DEFAULT_LOYALTY_EARN_RATE_IDR,
  DEFAULT_LOYALTY_REDEEM_MAX_PERCENT,
  DEFAULT_LOYALTY_REDEEM_VALUE_IDR,
  ErrorCodes,
  type LoyaltyEarnConfig,
  type LoyaltyRedeemConfig,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { toIdrInteger } from '../../common/utils/money.util';
import { normalizePhone } from '../online-orders/online-order.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { LinkCustomerDto } from './dto/link-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateByPhone(tenantId: string, name: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const trimmedName = name.trim();
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: normalizedPhone } },
    });
    if (existing) {
      if (existing.name !== trimmedName) {
        return this.prisma.customer.update({
          where: { id: existing.id },
          data: { name: trimmedName },
        });
      }
      return existing;
    }
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: trimmedName,
        phone: normalizedPhone,
      },
    });
  }

  async resolveOptionalCustomerId(
    tenantId: string,
    dto: Pick<LinkCustomerDto, 'customerId' | 'customerName' | 'customerPhone'>,
  ): Promise<string | null> {
    if (dto.customerId?.trim()) {
      const linked = await this.prisma.customer.findFirst({
        where: { id: dto.customerId.trim(), tenantId },
        select: { id: true },
      });
      if (!linked) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Pelanggan tidak ditemukan.',
        });
      }
      return linked.id;
    }
    const phone = dto.customerPhone?.trim();
    const name = dto.customerName?.trim();
    if (!phone || !name || name.length < 2) {
      return null;
    }
    const customer = await this.findOrCreateByPhone(tenantId, name, phone);
    return customer.id;
  }

  async getLoyaltyConfig(tenantId: string): Promise<LoyaltyEarnConfig> {
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return {
      enabled: row?.loyaltyPointsEnabled ?? true,
      earnRateIdr: row?.loyaltyEarnRateIdr ?? DEFAULT_LOYALTY_EARN_RATE_IDR,
    };
  }

  async getLoyaltyRedeemConfig(tenantId: string): Promise<LoyaltyRedeemConfig> {
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return {
      enabled: (row?.loyaltyRedeemEnabled ?? true) && (row?.loyaltyPointsEnabled ?? true),
      pointValueIdr: row?.loyaltyRedeemValueIdr ?? DEFAULT_LOYALTY_REDEEM_VALUE_IDR,
      maxPercentOfNet: row?.loyaltyRedeemMaxPercent ?? DEFAULT_LOYALTY_REDEEM_MAX_PERCENT,
    };
  }

  async lookupByPhone(tenantId: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const row = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: normalizedPhone } },
      select: { id: true, name: true, phone: true, points: true, creditLimit: true },
    });
    if (!row) {
      return null;
    }
    const deposit = await this.prisma.customerDeposit.findUnique({
      where: { customerId: row.id },
      select: { balance: true, status: true },
    });
    const receivableAgg = await this.prisma.receivable.aggregate({
      where: { tenantId, customerId: row.id, status: { in: ['OPEN', 'PARTIAL'] } },
      _sum: { amount: true, paidAmount: true },
    });
    const receivableOutstanding = Math.max(
      0,
      toIdrInteger(receivableAgg._sum.amount ?? 0) - toIdrInteger(receivableAgg._sum.paidAmount ?? 0),
    );
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      points: row.points,
      creditLimit: row.creditLimit != null ? toIdrInteger(row.creditLimit) : null,
      receivableOutstanding,
      depositBalance:
        deposit && deposit.status === 'ACTIVE' ? toIdrInteger(deposit.balance) : 0,
      creditAvailable:
        row.creditLimit != null
          ? Math.max(0, toIdrInteger(row.creditLimit) - receivableOutstanding)
          : null,
    };
  }

  async resolveLoyaltyRedeem(params: {
    tenantId: string;
    customerId: string | null;
    pointsRequested: number;
    netAfterPromoIdr: number;
  }): Promise<{ pointsRedeemed: number; discountIdr: number }> {
    const pointsRequested = params.pointsRequested ?? 0;
    if (pointsRequested <= 0 || !params.customerId) {
      return { pointsRedeemed: 0, discountIdr: 0 };
    }

    const config = await this.getLoyaltyRedeemConfig(params.tenantId);
    if (!config.enabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Penukaran poin loyalitas belum aktif untuk tenant ini.',
      });
    }

    const customer = await this.prisma.customer.findFirst({
      where: { id: params.customerId, tenantId: params.tenantId },
      select: { points: true },
    });
    if (!customer) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }

    if (pointsRequested > customer.points) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.LOYALTY_INSUFFICIENT_POINTS,
        message: `Saldo poin tidak mencukupi. Tersedia: ${customer.points} poin.`,
      });
    }

    return computeLoyaltyRedeemDiscount({
      pointsRequested,
      customerBalance: customer.points,
      netAfterPromoIdr: params.netAfterPromoIdr,
      config,
    });
  }

  async earnPointsForCompletedTransaction(
    tenantId: string,
    customerId: string | null | undefined,
    netSpendIdr: number,
  ): Promise<number> {
    if (!customerId || netSpendIdr <= 0) return 0;
    const config = await this.getLoyaltyConfig(tenantId);
    const earned = computeLoyaltyPointsEarned(netSpendIdr, config);
    if (earned <= 0) return 0;
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { points: { increment: earned } },
    });
    return earned;
  }

  async create(user: AuthJwtPayload, dto: CreateCustomerDto) {
    const normalizedPhone = normalizePhone(dto.phone);
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId: user.tenantId, phone: normalizedPhone } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: 'Nomor HP sudah terdaftar sebagai pelanggan.',
      });
    }
    const row = await this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        phone: normalizedPhone,
      },
    });
    return this.toCustomerSummary(row);
  }

  async getById(user: AuthJwtPayload, customerId: string) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      include: {
        _count: { select: { transactions: true, onlineOrders: true } },
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            receiptNo: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
        onlineOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNo: true,
            total: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      points: row.points,
      updatedAt: row.updatedAt.toISOString(),
      stats: {
        transactionCount: row._count.transactions,
        onlineOrderCount: row._count.onlineOrders,
      },
      recentTransactions: row.transactions.map((tx) => ({
        id: tx.id,
        receiptNo: tx.receiptNo,
        total: toIdrInteger(tx.total),
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
      })),
      recentOnlineOrders: row.onlineOrders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        total: toIdrInteger(order.total),
        status: order.status,
        createdAt: order.createdAt.toISOString(),
      })),
    };
  }

  async registerPublic(tenantSlug: string, dto: { name: string; phone: string; email?: string }) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: { id: true, name: true },
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko tidak ditemukan.',
      });
    }
    const customer = await this.findOrCreateByPhone(tenant.id, dto.name, dto.phone);
    return {
      customer: this.toCustomerSummary(customer),
      tenantName: tenant.name,
      message:
        'Pendaftaran member berhasil. Akun staff admin hanya dibuat oleh Pemilik/Manajer di dashboard.',
      memberLoginNote: 'Login member dengan password — belum tersedia (Fase 2).',
      emailStored: Boolean(dto.email?.trim()),
    };
  }

  private toCustomerSummary(row: {
    id: string;
    name: string;
    phone: string;
    points: number;
    updatedAt?: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      points: row.points,
      updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  async list(user: AuthJwtPayload, search?: string) {
    const rows = await this.prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' as const } },
                { phone: { contains: search.trim() } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        name: true,
        phone: true,
        points: true,
        updatedAt: true,
      },
    });
    return {
      customers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        points: row.points,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
}
