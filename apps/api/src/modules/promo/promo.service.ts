import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PromoApplyTo, PromoType } from '@barokah/database';
import {
  ErrorCodes,
  calculatePromoDiscount,
  pickBestPromo,
  type PromoCartLine,
  type PromoRuleInput,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreatePromoRuleDto, UpdatePromoRuleDto } from './dto/promo.dto';

function mapPromoRow(row: {
  id: string;
  name: string;
  type: PromoType;
  value: { toString(): string };
  applyTo: PromoApplyTo;
  categoryId: string | null;
  productId: string | null;
  minPurchase: { toString(): string } | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    value: Number(row.value),
    applyTo: row.applyTo,
    categoryId: row.categoryId,
    productId: row.productId,
    categoryName: row.category?.name ?? null,
    productName: row.product?.name ?? null,
    minPurchase: row.minPurchase != null ? Number(row.minPurchase) : null,
    isActive: row.isActive,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthJwtPayload) {
    const rows = await this.prisma.promoRule.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    return { promos: rows.map(mapPromoRow) };
  }

  async create(user: AuthJwtPayload, dto: CreatePromoRuleDto) {
    this.validatePromoDto(dto.type, dto.value, dto.applyTo ?? PromoApplyTo.ALL, dto.categoryId, dto.productId);

    const row = await this.prisma.promoRule.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        type: dto.type,
        value: dto.value,
        applyTo: dto.applyTo ?? PromoApplyTo.ALL,
        categoryId: dto.applyTo === PromoApplyTo.CATEGORY ? dto.categoryId : null,
        productId: dto.applyTo === PromoApplyTo.PRODUCT ? dto.productId : null,
        minPurchase: dto.minPurchase ?? null,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    return mapPromoRow(row);
  }

  async update(user: AuthJwtPayload, id: string, dto: UpdatePromoRuleDto) {
    const existing = await this.prisma.promoRule.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Promo tidak ditemukan.',
      });
    }

    const nextType = dto.type ?? existing.type;
    const nextValue = dto.value ?? Number(existing.value);
    const nextApplyTo = dto.applyTo ?? existing.applyTo;
    const nextCategoryId =
      dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
    const nextProductId = dto.productId !== undefined ? dto.productId : existing.productId;

    this.validatePromoDto(nextType, nextValue, nextApplyTo, nextCategoryId, nextProductId);

    const row = await this.prisma.promoRule.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        type: dto.type,
        value: dto.value,
        applyTo: dto.applyTo,
        categoryId:
          dto.applyTo === PromoApplyTo.CATEGORY
            ? dto.categoryId ?? undefined
            : dto.applyTo !== undefined
              ? null
              : dto.categoryId === null
                ? null
                : undefined,
        productId:
          dto.applyTo === PromoApplyTo.PRODUCT
            ? dto.productId ?? undefined
            : dto.applyTo !== undefined
              ? null
              : dto.productId === null
                ? null
                : undefined,
        minPurchase: dto.minPurchase === null ? null : dto.minPurchase,
        isActive: dto.isActive,
        startsAt:
          dto.startsAt === null ? null : dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt === null ? null : dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    return mapPromoRow(row);
  }

  async listActiveForPos(user: AuthJwtPayload) {
    const now = new Date();
    const rows = await this.prisma.promoRule.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
      },
    });
    return { promos: rows.map(mapPromoRow) };
  }

  async validateForCheckout(
    user: AuthJwtPayload,
    promoRuleId: string | undefined,
    cartLines: PromoCartLine[],
  ) {
    const activeRules = await this.loadActivePromoInputs(user.tenantId);
    if (activeRules.length === 0) {
      return { applicable: false, discountAmount: 0, subtotalAfter: cartLines.reduce((s, l) => s + l.lineSubtotal, 0) };
    }

    const selectedRule = promoRuleId
      ? activeRules.find((rule) => rule.id === promoRuleId)
      : null;

    if (promoRuleId && !selectedRule) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Promo tidak valid atau sudah tidak aktif.',
      });
    }

    const result = selectedRule
      ? calculatePromoDiscount(selectedRule, cartLines)
      : pickBestPromo(activeRules, cartLines);

    if (!result) {
      const subtotal = cartLines.reduce((sum, line) => sum + line.lineSubtotal, 0);
      return {
        applicable: false,
        discountAmount: 0,
        subtotalBefore: subtotal,
        subtotalAfter: subtotal,
        message: promoRuleId ? 'Promo tidak memenuhi syarat untuk keranjang ini.' : undefined,
      };
    }

    return {
      applicable: true,
      promoRuleId: result.promoRuleId,
      promoName: result.promoName,
      discountAmount: result.discountAmount,
      subtotalBefore: result.subtotalBefore,
      subtotalAfter: result.subtotalAfter,
    };
  }

  async validateWithItems(user: AuthJwtPayload, promoRuleId: string | undefined, items: Array<{ productId: string; quantity: number }>) {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true, id: { in: productIds } },
      select: { id: true, categoryId: true, price: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const cartLines: PromoCartLine[] = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Produk tidak ditemukan atau tidak aktif.',
        });
      }
      const unitPrice = Math.round(Number(product.price));
      cartLines.push({
        productId: product.id,
        categoryId: product.categoryId,
        lineSubtotal: unitPrice * item.quantity,
      });
    }

    return this.validateForCheckout(user, promoRuleId, cartLines);
  }

  async resolveCheckoutDiscount(
    user: AuthJwtPayload,
    promoRuleId: string | undefined,
    cartLines: PromoCartLine[],
  ): Promise<{ discountAmount: number; promoRuleId?: string; promoName?: string }> {
    const validation = await this.validateForCheckout(user, promoRuleId, cartLines);
    if (!validation.applicable || validation.discountAmount <= 0) {
      if (promoRuleId) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.VALIDATION_FAILED,
          message: validation.message ?? 'Promo tidak dapat diterapkan.',
        });
      }
      return { discountAmount: 0 };
    }
    return {
      discountAmount: validation.discountAmount,
      promoRuleId: validation.promoRuleId,
      promoName: validation.promoName,
    };
  }

  private async loadActivePromoInputs(tenantId: string): Promise<PromoRuleInput[]> {
    const now = new Date();
    const rows = await this.prisma.promoRule.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type as PromoRuleInput['type'],
      value: Number(row.value),
      applyTo: row.applyTo as PromoRuleInput['applyTo'],
      categoryId: row.categoryId,
      productId: row.productId,
      minPurchase: row.minPurchase != null ? Number(row.minPurchase) : null,
      isActive: row.isActive,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
    }));
  }

  async remove(user: AuthJwtPayload, id: string) {
    const existing = await this.prisma.promoRule.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Promo tidak ditemukan.',
      });
    }
    await this.prisma.promoRule.delete({ where: { id } });
    return { deleted: true, id };
  }

  private validatePromoDto(
    type: PromoType,
    value: number,
    applyTo: PromoApplyTo,
    categoryId?: string | null,
    productId?: string | null,
  ) {
    if (type === PromoType.PERCENTAGE && (value < 1 || value > 100)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Diskon persentase harus antara 1–100%.',
      });
    }
    if (applyTo === PromoApplyTo.CATEGORY && !categoryId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Kategori wajib dipilih untuk promo kategori.',
      });
    }
    if (applyTo === PromoApplyTo.PRODUCT && !productId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Produk wajib dipilih untuk promo produk.',
      });
    }
    if (applyTo === PromoApplyTo.ALL && (categoryId || productId)) {
      throw new ConflictException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Promo semua produk tidak boleh punya kategori/produk spesifik.',
      });
    }
  }
}
