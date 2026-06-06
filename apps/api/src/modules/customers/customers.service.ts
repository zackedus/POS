import { Injectable } from '@nestjs/common';
import {
  computeLoyaltyPointsEarned,
  DEFAULT_LOYALTY_EARN_RATE_IDR,
  type LoyaltyEarnConfig,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { normalizePhone } from '../online-orders/online-order.util';
import type { AuthJwtPayload } from '../auth/auth.types';
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
      return linked?.id ?? null;
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
