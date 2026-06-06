import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { Decimal } from '@prisma/client/runtime/library';

import type { Prisma } from '@prisma/client';

import { randomUUID } from 'node:crypto';

import { ErrorCodes } from '@barokah/shared';

import { convertFromBaseQuantity, buildProductSearchWhere } from '@barokah/shared';

import { PrismaService } from '../../common/database/prisma.service';

import { resolveOutletId } from '../../common/utils/outlet.util';

import type { AuthJwtPayload } from '../auth/auth.types';

import { AdjustStockDto, StockAdjustDirection } from './dto/adjust-stock.dto';

import { InventoryQueryDto } from './dto/inventory-query.dto';

import { OpnameStockDto } from './dto/opname-stock.dto';

import { StockAdjustReason } from './dto/stock-adjust-reason.enum';

import { StockMovementsQueryDto } from './dto/stock-movements-query.dto';

import { UpdateMinStockDto } from './dto/update-min-stock.dto';

import { TransferStockDto } from './dto/transfer-stock.dto';



const MOVEMENT_TYPE_LABELS: Record<string, string> = {

  SALE: 'Penjualan kasir',

  SALE_ONLINE: 'Penjualan online',

  PURCHASE: 'Penerimaan PO',

  PURCHASE_RETURN: 'Retur ke distributor',

  ADJUSTMENT: 'Penyesuaian manual',

  TRANSFER_IN: 'Transfer masuk',

  TRANSFER_OUT: 'Transfer keluar',

  VOID_RESTORE: 'Pengembalian void',

  OPNAME: 'Opname / stocktake',

};



@Injectable()

export class InventoryService {

  constructor(private readonly prisma: PrismaService) {}



  async listInventory(user: AuthJwtPayload, query: InventoryQueryDto) {

    const outletId = resolveOutletId(user, query.outletId);

    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);



    const searchWhere = buildProductSearchWhere(query.search);



    const rows = await this.prisma.inventoryItem.findMany({

      where: {

        outletId,

        ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}),

        ...(searchWhere ? { product: searchWhere } : {}),

      },

      include: {

        product: {

          select: {

            id: true,

            sku: true,

            name: true,

            isActive: true,

            hasVariants: true,

            variantLabel: true,

            parentProductId: true,

            categoryId: true,

            category: { select: { id: true, name: true } },

            parentProduct: { select: { name: true } },

            unit: { select: { symbol: true, name: true } },

            unitConversions: {

              where: { isPurchaseUnit: true },

              select: {

                conversionToBase: true,

                sellUnit: { select: { symbol: true, name: true } },

              },

              take: 1,

            },

          },

        },

      },

      orderBy: [{ product: { name: 'asc' } }],

    });



    const items = rows

      .filter((row) => !row.product.hasVariants)

      .map((row) => this.mapInventoryRow(row))

      .filter((item) => (query.lowStockOnly ? item.isLowStock : true));



    const stockableRows = rows.filter((row) => !row.product.hasVariants);



    return {

      outletId,

      items,

      lowStockCount: stockableRows.filter((row) => Number(row.quantity) <= Number(row.minStock)).length,

      totalCount: stockableRows.length,

    };

  }



  async listMovements(user: AuthJwtPayload, query: StockMovementsQueryDto) {

    const outletId = resolveOutletId(user, query.outletId);

    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);



    const limit = query.limit ?? 50;



    const movements = await this.prisma.stockMovement.findMany({

      where: {

        outletId,

        ...(query.productId ? { productId: query.productId } : {}),

        ...(query.type ? { type: query.type as never } : {}),

      },

      include: {

        product: {

          select: {

            sku: true,

            name: true,

            variantLabel: true,

            parentProduct: { select: { name: true } },

            unit: { select: { symbol: true } },

          },

        },

        createdBy: { select: { fullName: true } },

      },

      orderBy: [{ createdAt: 'desc' }],

      take: limit,

    });



    return {

      outletId,

      movements: movements.map((m) => {

        const variantLabel = m.product.variantLabel;

        const parentName = m.product.parentProduct?.name ?? null;

        const displayName =

          variantLabel && parentName

            ? `${parentName} — ${variantLabel}`

            : variantLabel

              ? `${m.product.name} (${variantLabel})`

              : m.product.name;



        return {

          id: m.id,

          outletId: m.outletId,

          productId: m.productId,

          sku: m.product.sku,

          productName: m.product.name,

          displayName,

          type: m.type,

          typeLabel: MOVEMENT_TYPE_LABELS[m.type] ?? m.type,

          quantity: Number(m.quantity),

          quantityBefore: Number(m.quantityBefore),

          quantityAfter: Number(m.quantityAfter),

          unitSymbol: m.product.unit?.symbol ?? null,

          referenceType: m.referenceType,

          referenceId: m.referenceId,

          notes: m.notes,

          createdByName: m.createdBy?.fullName ?? null,

          createdAt: m.createdAt.toISOString(),

        };

      }),

    };

  }



  async adjustStock(user: AuthJwtPayload, dto: AdjustStockDto) {

    const outletId = resolveOutletId(user, dto.outletId);

    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);



    const product = await this.prisma.product.findFirst({

      where: { id: dto.productId, tenantId: user.tenantId, isActive: true },

      select: { id: true, name: true, sku: true, hasVariants: true },

    });



    if (!product) {

      throw new NotFoundException({

        code: ErrorCodes.NOT_FOUND,

        message: 'Produk tidak ditemukan.',

      });

    }



    if (product.hasVariants) {

      throw new UnprocessableEntityException({

        code: ErrorCodes.INVALID_INPUT,

        message: 'Stok hanya dapat disesuaikan pada SKU varian, bukan produk induk varian.',

      });

    }



    const delta =

      dto.direction === StockAdjustDirection.IN

        ? new Decimal(dto.quantity)

        : new Decimal(dto.quantity).negated();



    const { movementType, notePrefix } = this.resolveAdjustMovementMeta(dto.direction, dto.reason);



    const result = await this.applyStockChange({

      outletId,

      productId: dto.productId,

      delta,

      movementType,

      referenceType: 'adjustment',

      notes: dto.notes?.trim() || notePrefix,

      createdById: user.sub,

    });



    return {

      outletId,

      productId: dto.productId,

      sku: product.sku,

      productName: product.name,

      direction: dto.direction,

      reason: dto.reason ?? StockAdjustReason.OTHER,

      quantity: dto.quantity,

      quantityBefore: Number(result.movement.quantityBefore),

      quantityAfter: Number(result.movement.quantityAfter),

      inventoryItemId: result.inventoryItem.id,

      movementId: result.movement.id,

    };

  }



  async opnameStock(user: AuthJwtPayload, dto: OpnameStockDto) {

    const outletId = resolveOutletId(user, dto.outletId);

    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);



    const product = await this.prisma.product.findFirst({

      where: { id: dto.productId, tenantId: user.tenantId },

      select: { id: true, name: true, sku: true, hasVariants: true, isActive: true },

    });



    if (!product) {

      throw new NotFoundException({

        code: ErrorCodes.NOT_FOUND,

        message: 'Produk tidak ditemukan.',

      });

    }



    if (product.hasVariants) {

      throw new UnprocessableEntityException({

        code: ErrorCodes.INVALID_INPUT,

        message: 'Opname hanya untuk SKU varian atau produk tanpa varian, bukan induk varian.',

      });

    }



    const existing = await this.prisma.inventoryItem.findUnique({

      where: { outletId_productId: { outletId, productId: dto.productId } },

    });



    const quantityBefore = new Decimal(existing?.quantity ?? 0);

    const quantityAfter = new Decimal(dto.actualQuantity);

    const delta = quantityAfter.sub(quantityBefore);



    if (delta.isZero()) {

      return {

        outletId,

        productId: dto.productId,

        sku: product.sku,

        productName: product.name,

        quantityBefore: Number(quantityBefore),

        quantityAfter: Number(quantityAfter),

        delta: 0,

        changed: false,

        movementId: null,

      };

    }



    const result = await this.applyStockChange({

      outletId,

      productId: dto.productId,

      delta,

      movementType: 'OPNAME',

      referenceType: 'opname',

      notes: dto.notes?.trim() || 'Opname fisik — penyesuaian ke qty aktual',

      createdById: user.sub,

    });



    return {

      outletId,

      productId: dto.productId,

      sku: product.sku,

      productName: product.name,

      quantityBefore: Number(result.movement.quantityBefore),

      quantityAfter: Number(result.movement.quantityAfter),

      delta: Number(delta),

      changed: true,

      movementId: result.movement.id,

    };

  }



  async updateMinStock(user: AuthJwtPayload, inventoryItemId: string, dto: UpdateMinStockDto) {

    const row = await this.prisma.inventoryItem.findFirst({

      where: {

        id: inventoryItemId,

        outlet: { tenantId: user.tenantId },

      },

    });



    if (!row) {

      throw new NotFoundException({

        code: ErrorCodes.NOT_FOUND,

        message: 'Item stok tidak ditemukan.',

      });

    }



    resolveOutletId(user, row.outletId);



    const updated = await this.prisma.inventoryItem.update({

      where: { id: inventoryItemId },

      data: { minStock: new Decimal(dto.minStock) },

      include: {

        product: { select: { sku: true, name: true } },

      },

    });



    const quantity = Number(updated.quantity);

    const minStock = Number(updated.minStock);



    return {

      id: updated.id,

      outletId: updated.outletId,

      productId: updated.productId,

      sku: updated.product.sku,

      productName: updated.product.name,

      quantity,

      minStock,

      isLowStock: quantity <= minStock,

    };

  }



  async transferStock(user: AuthJwtPayload, dto: TransferStockDto) {

    const fromOutletId = resolveOutletId(user, dto.fromOutletId);

    const toOutletId = dto.toOutletId;



    if (fromOutletId === toOutletId) {

      throw new UnprocessableEntityException({

        code: ErrorCodes.INVALID_INPUT,

        message: 'Cabang asal dan tujuan transfer harus berbeda.',

      });

    }



    await this.ensureOutletBelongsToTenant(user.tenantId, fromOutletId);

    await this.ensureOutletBelongsToTenant(user.tenantId, toOutletId);

    resolveOutletId(user, toOutletId);



    const product = await this.prisma.product.findFirst({

      where: { id: dto.productId, tenantId: user.tenantId, isActive: true },

      select: { id: true, name: true, sku: true, hasVariants: true },

    });



    if (!product) {

      throw new NotFoundException({

        code: ErrorCodes.NOT_FOUND,

        message: 'Produk tidak ditemukan.',

      });

    }



    if (product.hasVariants) {

      throw new UnprocessableEntityException({

        code: ErrorCodes.INVALID_INPUT,

        message: 'Transfer stok hanya untuk SKU varian, bukan produk induk varian.',

      });

    }



    const transferRef = randomUUID();

    const noteBase = dto.notes?.trim() || `Transfer antar cabang (${fromOutletId.slice(0, 8)} → ${toOutletId.slice(0, 8)})`;

    const qty = new Decimal(dto.quantity);



    const result = await this.prisma.$transaction(async (tx) => {

      const outResult = await this.applyStockChangeInTx(tx, {

        outletId: fromOutletId,

        productId: dto.productId,

        delta: qty.negated(),

        movementType: 'TRANSFER_OUT',

        referenceType: 'transfer',

        referenceId: transferRef,

        notes: `${noteBase} — keluar`,

        createdById: user.sub,

      });



      const inResult = await this.applyStockChangeInTx(tx, {

        outletId: toOutletId,

        productId: dto.productId,

        delta: qty,

        movementType: 'TRANSFER_IN',

        referenceType: 'transfer',

        referenceId: transferRef,

        notes: `${noteBase} — masuk`,

        createdById: user.sub,

      });



      return { outResult, inResult };

    });



    return {

      transferId: transferRef,

      fromOutletId,

      toOutletId,

      productId: dto.productId,

      sku: product.sku,

      productName: product.name,

      quantity: dto.quantity,

      fromQuantityAfter: Number(result.outResult.movement.quantityAfter),

      toQuantityAfter: Number(result.inResult.movement.quantityAfter),

      outMovementId: result.outResult.movement.id,

      inMovementId: result.inResult.movement.id,

    };

  }



  private resolveAdjustMovementMeta(direction: StockAdjustDirection, reason?: StockAdjustReason) {

    const resolvedReason = reason ?? StockAdjustReason.OTHER;



    if (direction === StockAdjustDirection.IN && resolvedReason === StockAdjustReason.TRANSFER_IN) {

      return { movementType: 'TRANSFER_IN' as const, notePrefix: 'Transfer masuk antar cabang' };

    }

    if (direction === StockAdjustDirection.OUT && resolvedReason === StockAdjustReason.TRANSFER_OUT) {

      return { movementType: 'TRANSFER_OUT' as const, notePrefix: 'Transfer keluar antar cabang' };

    }



    const reasonNotes: Partial<Record<StockAdjustReason, string>> = {

      [StockAdjustReason.GIFT]: 'Stok masuk — hadiah/bonus',

      [StockAdjustReason.DAMAGED]: 'Stok keluar — barang rusak',

      [StockAdjustReason.SAMPLE]: 'Stok keluar — sample/promosi',

      [StockAdjustReason.OPNAME]: 'Penyesuaian opname',

      [StockAdjustReason.OTHER]: `Penyesuaian manual ${direction}`,

    };



    return {

      movementType: 'ADJUSTMENT' as const,

      notePrefix: reasonNotes[resolvedReason] ?? `Penyesuaian manual ${direction}`,

    };

  }



  private async applyStockChange(params: {
    outletId: string;
    productId: string;
    delta: Decimal;
    movementType: string;
    referenceType: string;
    referenceId?: string;
    notes: string;
    createdById: string;
  }) {
    return this.prisma.$transaction((tx) => this.applyStockChangeInTx(tx, params));
  }

  private async applyStockChangeInTx(
    tx: Prisma.TransactionClient,
    params: {
      outletId: string;
      productId: string;
      delta: Decimal;
      movementType: string;
      referenceType: string;
      referenceId?: string;
      notes: string;
      createdById: string;
    },
  ) {
      const existing = await tx.inventoryItem.findUnique({
        where: {
          outletId_productId: { outletId: params.outletId, productId: params.productId },
        },
      });

      const quantityBefore = new Decimal(existing?.quantity ?? 0);
      const quantityAfter = quantityBefore.add(params.delta);

      if (quantityAfter.lessThan(0)) {
        throw new ConflictException({
          code: ErrorCodes.INSUFFICIENT_STOCK,
          message: 'Stok tidak mencukupi untuk penyesuaian keluar.',
          details: [
            {
              field: 'quantity',
              message: `Stok tersedia: ${quantityBefore.toString()}`,
            },
          ],
        });
      }

      const inventoryItem = existing
        ? await tx.inventoryItem.update({
            where: { id: existing.id },
            data: { quantity: quantityAfter },
          })
        : await tx.inventoryItem.create({
            data: {
              outletId: params.outletId,
              productId: params.productId,
              quantity: quantityAfter,
              minStock: new Decimal(0),
            },
          });

      const movement = await tx.stockMovement.create({
        data: {
          outletId: params.outletId,
          productId: params.productId,
          type: params.movementType as never,
          quantity: params.delta,
          quantityBefore,
          quantityAfter,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          notes: params.notes,
          createdById: params.createdById,
        },
      });

      return { inventoryItem, movement };
  }



  private mapInventoryRow(row: {

    id: string;

    outletId: string;

    productId: string;

    quantity: Decimal;

    minStock: Decimal;

    product: {

      id: string;

      sku: string;

      name: string;

      isActive: boolean;

      hasVariants: boolean;

      variantLabel: string | null;

      parentProductId: string | null;

      categoryId: string | null;

      category: { id: string; name: string } | null;

      parentProduct: { name: string } | null;

      unit: { symbol: string; name: string } | null;

      unitConversions: Array<{

        conversionToBase: Decimal;

        sellUnit: { symbol: string; name: string };

      }>;

    };

  }) {

    const quantity = Number(row.quantity);

    const minStock = Number(row.minStock);

    const isLowStock = quantity <= minStock;

    const variantLabel = row.product.variantLabel;

    const parentName = row.product.parentProduct?.name ?? null;

    const displayName =

      variantLabel && parentName

        ? `${parentName} — ${variantLabel}`

        : variantLabel

          ? `${row.product.name} (${variantLabel})`

          : row.product.name;

    const purchaseConversion = row.product.unitConversions?.[0];

    const purchaseEquivalent =

      purchaseConversion && Number(purchaseConversion.conversionToBase) > 0

        ? {

            quantity: convertFromBaseQuantity(quantity, Number(purchaseConversion.conversionToBase)),

            unitSymbol: purchaseConversion.sellUnit.symbol,

            unitName: purchaseConversion.sellUnit.name,

          }

        : null;



    return {

      id: row.id,

      outletId: row.outletId,

      productId: row.productId,

      sku: row.product.sku,

      productName: row.product.name,

      displayName,

      variantLabel,

      parentProductName: parentName,

      hasVariants: row.product.hasVariants,

      categoryId: row.product.categoryId,

      categoryName: row.product.category?.name ?? null,

      unitSymbol: row.product.unit?.symbol ?? null,

      unitName: row.product.unit?.name ?? null,

      quantity,

      purchaseEquivalent,

      minStock,

      isLowStock,

      isActive: row.product.isActive,

    };

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


