import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  convertToBaseQuantity,
  deriveBaseCostFromPurchaseCost,
  ErrorCodes,
  mapPrismaUnitConversions,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PurchaseHistoryQueryDto } from './dto/purchase-history-query.dto';
import { ReceivePurchaseDto } from './dto/receive-purchase.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async listSuppliers(user: AuthJwtPayload) {
    return this.prisma.supplier.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ name: 'asc' }],
    });
  }

  async createSupplier(user: AuthJwtPayload, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
      },
    });
  }

  async updateSupplier(user: AuthJwtPayload, supplierId: string, dto: UpdateSupplierDto) {
    await this.ensureSupplierExists(user.tenantId, supplierId);

    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async listPurchaseReceives(user: AuthJwtPayload, query: PurchaseHistoryQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        outletId,
        type: 'PURCHASE',
      },
      include: {
        product: { select: { sku: true, name: true } },
        createdBy: { select: { fullName: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 50,
    });

    return movements.map((row) => ({
      id: row.id,
      outletId: row.outletId,
      productId: row.productId,
      sku: row.product.sku,
      productName: row.product.name,
      quantity: Number(row.quantity),
      quantityBefore: Number(row.quantityBefore),
      quantityAfter: Number(row.quantityAfter),
      notes: row.notes,
      createdByName: row.createdBy.fullName,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async receivePurchase(user: AuthJwtPayload, dto: ReceivePurchaseDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);

    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
    });

    if (!supplier) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Supplier tidak ditemukan.',
      });
    }

    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unitId: true,
        unit: { select: { id: true, symbol: true, name: true } },
        unitConversions: {
          where: { isPurchaseUnit: true },
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
            sellUnit: { select: { id: true, symbol: true, name: true } },
          },
        },
      },
    });

    if (products.length !== new Set(productIds).size) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Salah satu produk tidak valid.',
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const receiveNote = dto.notes?.trim() || `Penerimaan dari ${supplier.name}`;

    const results = await this.prisma.$transaction(async (tx) => {
      const applied = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const purchaseConversions = mapPrismaUnitConversions(product.unitConversions);
        const purchaseUnitId = item.unitId ?? purchaseConversions.find((row) => row.isPurchaseUnit)?.unitId;
        let baseQuantity = item.quantity;
        let receiveUnitLabel = product.unit?.symbol ?? 'base';

        if (purchaseUnitId && purchaseUnitId !== product.unitId) {
          baseQuantity = convertToBaseQuantity(
            item.quantity,
            purchaseUnitId,
            product.unitId!,
            purchaseConversions,
          );
          const purchaseUnit = product.unitConversions.find((row) => row.sellUnitId === purchaseUnitId)?.sellUnit;
          receiveUnitLabel = purchaseUnit?.symbol ?? receiveUnitLabel;
        } else if (item.unitId && item.unitId !== product.unitId) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.INVALID_INPUT,
            message: `Satuan penerimaan tidak valid untuk produk ${product.sku}.`,
          });
        }

        const delta = new Decimal(baseQuantity);
        const lineNote = `${item.quantity} ${receiveUnitLabel} (= ${baseQuantity} ${product.unit?.symbol ?? 'base'})`;
        const existing = await tx.inventoryItem.findUnique({
          where: {
            outletId_productId: { outletId, productId: item.productId },
          },
        });

        const quantityBefore = new Decimal(existing?.quantity ?? 0);
        const quantityAfter = quantityBefore.add(delta);

        const inventoryItem = existing
          ? await tx.inventoryItem.update({
              where: { id: existing.id },
              data: { quantity: quantityAfter },
            })
          : await tx.inventoryItem.create({
              data: {
                outletId,
                productId: item.productId,
                quantity: quantityAfter,
                minStock: new Decimal(0),
              },
            });

        const movement = await tx.stockMovement.create({
          data: {
            outletId,
            productId: item.productId,
            type: 'PURCHASE',
            quantity: delta,
            quantityBefore,
            quantityAfter,
            referenceType: 'supplier',
            referenceId: supplier.id,
            notes: `${receiveNote} | ${lineNote}`,
            createdById: user.sub,
          },
        });

        if (item.unitCost != null && item.unitCost > 0) {
          const conversionToBase =
            purchaseUnitId && purchaseUnitId !== product.unitId
              ? purchaseConversions.find((row) => row.unitId === purchaseUnitId)?.conversionToBase ?? 1
              : 1;
          const baseCostApplied = deriveBaseCostFromPurchaseCost(item.unitCost, conversionToBase);
          if (baseCostApplied > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { costPrice: new Decimal(baseCostApplied) },
            });
          }
        }

        applied.push({
          movementId: movement.id,
          inventoryItemId: inventoryItem.id,
          productId: item.productId,
          sku: product.sku,
          productName: product.name,
          quantity: item.quantity,
          receiveUnitSymbol: receiveUnitLabel,
          baseQuantityAdded: baseQuantity,
          quantityAfter: Number(quantityAfter),
        });
      }

      return applied;
    });

    return {
      outletId,
      supplierId: supplier.id,
      supplierName: supplier.name,
      notes: receiveNote,
      items: results,
    };
  }

  private async ensureSupplierExists(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Supplier tidak ditemukan.',
      });
    }
  }

  private async ensureOutletBelongsToTenant(tenantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId, isActive: true },
      select: { id: true },
    });

    if (!outlet) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Outlet tidak ditemukan.',
      });
    }
  }
}
