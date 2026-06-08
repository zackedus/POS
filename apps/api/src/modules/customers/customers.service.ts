import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import {
  buildMemberQrPayload,
  computeLoyaltyPointsEarned,
  computeLoyaltyRedeemDiscount,
  DEFAULT_LOYALTY_EARN_RATE_IDR,
  DEFAULT_LOYALTY_REDEEM_MAX_PERCENT,
  DEFAULT_LOYALTY_REDEEM_VALUE_IDR,
  ErrorCodes,
  generateMemberCode,
  MEMBER_TIER_STUB,
  type LoyaltyEarnConfig,
  type LoyaltyRedeemConfig,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { normalizePhone } from '../online-orders/online-order.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FinanceCheckoutService } from '../finance/finance-checkout.service';
import { ReceivablesService } from '../finance/receivables.service';
import type { CreateCustomerAddressDto, UpdateCustomerAddressDto } from './dto/customer-address.dto';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { LinkCustomerDto } from './dto/link-customer.dto';
import type { LoyaltyLedgerQueryDto } from './dto/loyalty-ledger-query.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly financeCheckout: FinanceCheckoutService,
    private readonly receivablesService: ReceivablesService,
  ) {}

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
    const memberCode = await this.generateUniqueMemberCode(tenantId);
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: trimmedName,
        phone: normalizedPhone,
        memberCode,
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

  private async buildFinanceSnapshot(tenantId: string, customerId: string, creditLimit: Prisma.Decimal | null) {
    const [receivableOutstanding, depositBalance] = await Promise.all([
      this.financeCheckout.getCustomerOutstandingReceivableIdr(tenantId, customerId),
      this.financeCheckout.getCustomerDepositBalanceIdr(tenantId, customerId),
    ]);
    const creditLimitIdr = creditLimit != null ? toIdrInteger(creditLimit) : null;
    return {
      receivableOutstanding,
      depositBalance,
      creditLimit: creditLimitIdr,
      creditAvailable:
        creditLimitIdr != null ? Math.max(0, creditLimitIdr - receivableOutstanding) : null,
    };
  }

  async lookupByPhone(tenantId: string, phone: string) {
    const normalizedPhone = normalizePhone(phone);
    const row = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId, phone: normalizedPhone } },
      select: {
        id: true,
        name: true,
        phone: true,
        memberCode: true,
        points: true,
        creditLimit: true,
      },
    });
    if (!row) {
      return null;
    }
    const finance = await this.buildFinanceSnapshot(tenantId, row.id, row.creditLimit);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      memberCode: row.memberCode,
      points: row.points,
      ...finance,
    };
  }

  async lookupByMemberCode(tenantId: string, memberCode: string) {
    const normalized = memberCode.trim().toUpperCase();
    const row = await this.prisma.customer.findFirst({
      where: { tenantId, memberCode: normalized },
      select: {
        id: true,
        name: true,
        phone: true,
        memberCode: true,
        points: true,
        creditLimit: true,
      },
    });
    if (!row) {
      return null;
    }
    const finance = await this.buildFinanceSnapshot(tenantId, row.id, row.creditLimit);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      memberCode: row.memberCode,
      points: row.points,
      ...finance,
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
    transactionId?: string,
  ): Promise<number> {
    if (!customerId || netSpendIdr <= 0) return 0;
    const config = await this.getLoyaltyConfig(tenantId);
    const earned = computeLoyaltyPointsEarned(netSpendIdr, config);
    if (earned <= 0) return 0;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: { points: { increment: earned } },
        select: { points: true },
      });
      await tx.loyaltyPointLedger.create({
        data: {
          tenantId,
          customerId,
          type: 'EARN',
          points: earned,
          balanceAfter: updated.points,
          transactionId: transactionId ?? null,
          notes: 'Poin dari transaksi POS',
        },
      });
    });
    return earned;
  }

  async recordLoyaltyRedeemInTransaction(
    tx: TxClient,
    params: {
      tenantId: string;
      customerId: string;
      pointsRedeemed: number;
      transactionId: string;
    },
  ): Promise<void> {
    if (params.pointsRedeemed <= 0) return;
    const updated = await tx.customer.update({
      where: { id: params.customerId },
      data: { points: { decrement: params.pointsRedeemed } },
      select: { points: true },
    });
    if (updated.points < 0) {
      throw new ConflictException({
        code: ErrorCodes.LOYALTY_INSUFFICIENT_POINTS,
        message: 'Saldo poin tidak mencukupi saat checkout.',
      });
    }
    await tx.loyaltyPointLedger.create({
      data: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        type: 'REDEEM',
        points: -params.pointsRedeemed,
        balanceAfter: updated.points,
        transactionId: params.transactionId,
        notes: 'Penukaran poin saat checkout',
      },
    });
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
    const memberCode = await this.generateUniqueMemberCode(user.tenantId);
    const row = await this.prisma.customer.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        phone: normalizedPhone,
        memberCode,
        email: dto.email?.trim() || null,
      },
    });
    return this.toCustomerSummary(row);
  }

  async update(user: AuthJwtPayload, customerId: string, dto: UpdateCustomerDto) {
    await this.assertCustomer(user.tenantId, customerId);
    const data: Prisma.CustomerUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;
    if (dto.creditLimit !== undefined) {
      data.creditLimit = dto.creditLimit === null ? null : idrToDecimal(dto.creditLimit);
    }
    if (dto.phone !== undefined) {
      const normalizedPhone = normalizePhone(dto.phone);
      const duplicate = await this.prisma.customer.findFirst({
        where: {
          tenantId: user.tenantId,
          phone: normalizedPhone,
          NOT: { id: customerId },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_ENTRY,
          message: 'Nomor HP sudah digunakan pelanggan lain.',
        });
      }
      data.phone = normalizedPhone;
    }

    const row = await this.prisma.customer.update({
      where: { id: customerId },
      data,
    });
    return this.toCustomerSummary(row);
  }

  async getById(user: AuthJwtPayload, customerId: string) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      include: {
        _count: { select: { transactions: true, onlineOrders: true, addresses: true } },
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
    const finance = await this.buildFinanceSnapshot(user.tenantId, row.id, row.creditLimit);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      memberCode: row.memberCode,
      memberSince: row.memberSince.toISOString(),
      notes: row.notes,
      points: row.points,
      ...finance,
      updatedAt: row.updatedAt.toISOString(),
      stats: {
        transactionCount: row._count.transactions,
        onlineOrderCount: row._count.onlineOrders,
        addressCount: row._count.addresses,
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

  async getFinanceSummary(user: AuthJwtPayload, customerId: string) {
    return this.receivablesService.getCustomerFinanceSummary(user, customerId);
  }

  async getLoyaltyLedger(user: AuthJwtPayload, customerId: string, query: LoyaltyLedgerQueryDto) {
    await this.assertCustomer(user.tenantId, customerId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [rows, total, customer] = await Promise.all([
      this.prisma.loyaltyPointLedger.findMany({
        where: { tenantId: user.tenantId, customerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          points: true,
          balanceAfter: true,
          transactionId: true,
          notes: true,
          createdAt: true,
        },
      }),
      this.prisma.loyaltyPointLedger.count({ where: { tenantId: user.tenantId, customerId } }),
      this.prisma.customer.findFirst({
        where: { id: customerId, tenantId: user.tenantId },
        select: { points: true },
      }),
    ]);

    return {
      balance: customer?.points ?? 0,
      entries: rows.map((entry) => ({
        id: entry.id,
        type: entry.type,
        points: entry.points,
        balanceAfter: entry.balanceAfter,
        transactionId: entry.transactionId,
        notes: entry.notes,
        createdAt: entry.createdAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async listAddresses(user: AuthJwtPayload, customerId: string) {
    await this.assertCustomer(user.tenantId, customerId);
    const rows = await this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return {
      addresses: rows.map((row) => this.mapAddress(row)),
    };
  }

  async createAddress(user: AuthJwtPayload, customerId: string, dto: CreateCustomerAddressDto) {
    await this.assertCustomer(user.tenantId, customerId);
    const isDefault = dto.isDefault ?? false;

    const row = await this.prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.customerAddress.updateMany({
          where: { customerId },
          data: { isDefault: false },
        });
      } else {
        const count = await tx.customerAddress.count({ where: { customerId } });
        if (count === 0) {
          dto = { ...dto, isDefault: true };
        }
      }
      return tx.customerAddress.create({
        data: {
          customerId,
          label: dto.label.trim(),
          addressLine1: dto.addressLine1.trim(),
          addressLine2: dto.addressLine2?.trim() || null,
          city: dto.city.trim(),
          province: dto.province?.trim() || null,
          postalCode: dto.postalCode?.trim() || null,
          isDefault: dto.isDefault ?? isDefault,
        },
      });
    });
    return this.mapAddress(row);
  }

  async updateAddress(
    user: AuthJwtPayload,
    customerId: string,
    addressId: string,
    dto: UpdateCustomerAddressDto,
  ) {
    await this.assertCustomer(user.tenantId, customerId);
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Alamat tidak ditemukan.',
      });
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.customerAddress.updateMany({
          where: { customerId, NOT: { id: addressId } },
          data: { isDefault: false },
        });
      }
      return tx.customerAddress.update({
        where: { id: addressId },
        data: {
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1.trim() } : {}),
          ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2?.trim() || null } : {}),
          ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
          ...(dto.province !== undefined ? { province: dto.province?.trim() || null } : {}),
          ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode?.trim() || null } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
        },
      });
    });
    return this.mapAddress(row);
  }

  async deleteAddress(user: AuthJwtPayload, customerId: string, addressId: string) {
    await this.assertCustomer(user.tenantId, customerId);
    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Alamat tidak ditemukan.',
      });
    }
    await this.prisma.customerAddress.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await this.prisma.customerAddress.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'asc' },
      });
      if (next) {
        await this.prisma.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
    return { deleted: true };
  }

  async getMemberCard(user: AuthJwtPayload, customerId: string) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        memberCode: true,
        memberSince: true,
        points: true,
        tenant: { select: { name: true, slug: true, logoUrl: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
    return {
      memberCode: row.memberCode,
      memberName: row.name,
      tenantName: row.tenant.name,
      tenantLogoUrl: row.tenant.logoUrl,
      points: row.points,
      tier: MEMBER_TIER_STUB,
      memberSince: row.memberSince.toISOString(),
      qrPayload: buildMemberQrPayload(row.tenant.slug, row.memberCode),
    };
  }

  async regenerateMemberCode(user: AuthJwtPayload, customerId: string) {
    await this.assertCustomer(user.tenantId, customerId);
    const memberCode = await this.generateUniqueMemberCode(user.tenantId);
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { memberCode },
    });
    return this.getMemberCard(user, customerId);
  }

  async registerPublic(
    tenantSlug: string,
    dto: { name: string; phone: string; email?: string },
  ) {
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
    const normalizedPhone = normalizePhone(dto.phone);
    const existing = await this.prisma.customer.findUnique({
      where: { tenantId_phone: { tenantId: tenant.id, phone: normalizedPhone } },
    });
    let customer = existing;
    if (!customer) {
      const memberCode = await this.generateUniqueMemberCode(tenant.id);
      customer = await this.prisma.customer.create({
        data: {
          tenantId: tenant.id,
          name: dto.name.trim(),
          phone: normalizedPhone,
          memberCode,
          email: dto.email?.trim() || null,
        },
      });
    } else if (dto.email?.trim() && customer && !customer.email) {
      customer = await this.prisma.customer.update({
        where: { id: customer.id },
        data: { email: dto.email.trim(), name: dto.name.trim() },
      });
    }
    if (!customer) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
    return {
      customer: this.toCustomerSummary(customer),
      tenantName: tenant.name,
      message:
        'Pendaftaran member berhasil. Akun staff admin hanya dibuat oleh Pemilik/Manajer di dashboard.',
      memberLoginNote: 'Login member dengan password — belum tersedia (Fase 2).',
      emailStored: Boolean(dto.email?.trim()),
    };
  }

  private mapAddress(row: {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string | null;
    postalCode: string | null;
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: row.id,
      label: row.label,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      province: row.province,
      postalCode: row.postalCode,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertCustomer(tenantId: string, customerId: string) {
    const row = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pelanggan tidak ditemukan.',
      });
    }
  }

  private async generateUniqueMemberCode(tenantId: string): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateMemberCode();
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, memberCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    throw new ConflictException({
      code: ErrorCodes.DUPLICATE_ENTRY,
      message: 'Gagal menghasilkan kode member unik. Coba lagi.',
    });
  }

  private toCustomerSummary(row: {
    id: string;
    name: string;
    phone: string;
    memberCode?: string;
    points: number;
    updatedAt?: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      memberCode: row.memberCode,
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
                { memberCode: { contains: search.trim().toUpperCase() } },
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
        memberCode: true,
        points: true,
        creditLimit: true,
        updatedAt: true,
      },
    });

    const customerIds = rows.map((r) => r.id);
    const [receivableAgg, deposits] = await Promise.all([
      customerIds.length
        ? this.prisma.receivable.groupBy({
            by: ['customerId'],
            where: {
              tenantId: user.tenantId,
              customerId: { in: customerIds },
              status: { in: ['OPEN', 'PARTIAL'] },
            },
            _sum: { amount: true, paidAmount: true },
          })
        : [],
      customerIds.length
        ? this.prisma.customerDeposit.findMany({
            where: { customerId: { in: customerIds }, status: 'ACTIVE' },
            select: { customerId: true, balance: true },
          })
        : [],
    ]);

    const receivableMap = new Map(
      receivableAgg.map((r) => [
        r.customerId,
        Math.max(0, toIdrInteger(r._sum.amount ?? 0) - toIdrInteger(r._sum.paidAmount ?? 0)),
      ]),
    );
    const depositMap = new Map(deposits.map((d) => [d.customerId, toIdrInteger(d.balance)]));

    return {
      customers: rows.map((row) => {
        const receivableOutstanding = receivableMap.get(row.id) ?? 0;
        const depositBalance = depositMap.get(row.id) ?? 0;
        const creditLimit = row.creditLimit != null ? toIdrInteger(row.creditLimit) : null;
        return {
          id: row.id,
          name: row.name,
          phone: row.phone,
          memberCode: row.memberCode,
          points: row.points,
          receivableOutstanding,
          depositBalance,
          creditLimit,
          creditAvailable:
            creditLimit != null ? Math.max(0, creditLimit - receivableOutstanding) : null,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    };
  }
}
