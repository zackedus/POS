import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PurchaseOrderStatus, Prisma } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import {
  computeWeightedAverageBaseCost,
  convertToBaseQuantity,
  deriveBaseCostFromPurchaseCost,
  derivePurchaseCostFromBaseCost,
  ErrorCodes,
  mapPrismaUnitConversions,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { assertOutletAccess, resolveOutletId } from '../../common/utils/outlet.util';
import { buildPaginationMeta, resolvePagination } from '../../common/utils/pagination.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { PayablesService } from '../finance/payables.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreatePurchaseOrderReturnDto } from './dto/create-purchase-order-return.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';
import { ReceivePurchaseOrderDto } from './dto/receive-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import {
  buildPurchaseOrderNo,
  buildPurchaseOrderReturnNo,
  PO_CANCEL_REMAINING_STATUSES,
  PO_CANCELLABLE_STATUSES,
  PO_EDITABLE_STATUSES,
  PO_RECEIVABLE_STATUSES,
  PO_RETURNABLE_STATUSES,
  toDateKey,
} from './purchase-order.util';

const PO_INCLUDE = {
  supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
  outlet: { select: { id: true, name: true, code: true, address: true } },
  createdBy: { select: { id: true, fullName: true } },
  submittedBy: { select: { id: true, fullName: true } },
  items: {
    orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }],
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          costPrice: true,
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
      },
      unit: { select: { id: true, symbol: true, name: true } },
    },
  },
  receipts: {
    orderBy: [{ receivedAt: 'desc' as const }],
    take: 10,
    include: {
      createdBy: { select: { fullName: true } },
      lines: {
        include: {
          product: { select: { sku: true, name: true } },
        },
      },
    },
  },
  returns: {
    orderBy: [{ returnedAt: 'desc' as const }],
    take: 10,
    include: {
      createdBy: { select: { fullName: true } },
      lines: {
        include: {
          product: { select: { sku: true, name: true } },
        },
      },
    },
  },
  payable: {
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      status: true,
      dueDate: true,
    },
  },
};

const RETURN_INCLUDE = {
  purchaseOrder: {
    include: {
      supplier: { select: { id: true, name: true, phone: true, email: true, address: true } },
      outlet: { select: { id: true, name: true, code: true, address: true } },
    },
  },
  createdBy: { select: { id: true, fullName: true } },
  lines: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unit: { select: { id: true, symbol: true, name: true } },
        },
      },
      purchaseOrderItem: {
        include: {
          unit: { select: { id: true, symbol: true, name: true } },
        },
      },
    },
  },
};

type PurchaseOrderReturnWithDetails = Prisma.PurchaseOrderReturnGetPayload<{
  include: typeof RETURN_INCLUDE;
}>;

type PurchaseOrderWithDetails = Prisma.PurchaseOrderGetPayload<{ include: typeof PO_INCLUDE }>;

type ProductWithUnits = {
  id: string;
  sku: string;
  name: string;
  costPrice: Decimal;
  unitId: string | null;
  unit: { id: string; symbol: string; name: string } | null;
  unitConversions: Array<{
    sellUnitId: string;
    conversionToBase: Decimal;
    isPurchaseUnit: boolean;
    isSellUnit: boolean;
    sellStep: Decimal | null;
    minQty: Decimal | null;
    sellUnit: { id: string; symbol: string; name: string };
  }>;
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payablesService: PayablesService,
  ) {}

  async listPurchaseOrders(user: AuthJwtPayload, query: ListPurchaseOrdersQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);
    const { page, limit, skip } = resolvePagination(query, 25);

    const where = {
      tenantId: user.tenantId,
      outletId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { orderNo: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { supplier: { name: { contains: query.search.trim(), mode: 'insensitive' as const } } },
            ],
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(`${query.dateFrom.slice(0, 10)}T00:00:00.000Z`) } : {}),
              ...(query.dateTo ? { lte: new Date(`${query.dateTo.slice(0, 10)}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          items: { select: { id: true, lineTotal: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.mapPurchaseOrderSummary(row)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getPurchaseOrder(user: AuthJwtPayload, purchaseOrderId: string) {
    const po = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    return this.mapPurchaseOrderDetail(po);
  }

  async createPurchaseOrder(user: AuthJwtPayload, dto: CreatePurchaseOrderDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    await this.ensureOutletBelongsToTenant(user.tenantId, outletId);
    await this.ensureSupplierActive(user.tenantId, dto.supplierId);

    const preparedItems = await this.prepareLineItems(user.tenantId, dto.items);
    const orderNo = await this.nextOrderNo(user.tenantId);

    const created = await this.prisma.purchaseOrder.create({
      data: {
        tenantId: user.tenantId,
        outletId,
        supplierId: dto.supplierId,
        orderNo,
        status: PurchaseOrderStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        expectedDeliveryAt: dto.expectedDeliveryAt ? new Date(dto.expectedDeliveryAt) : null,
        createdById: user.sub,
        items: {
          create: preparedItems.map((item, index) => ({
            productId: item.productId,
            unitId: item.unitId,
            orderedQuantity: new Decimal(item.quantity),
            unitCost: new Decimal(item.unitCost),
            lineTotal: new Decimal(item.lineTotal),
            sortOrder: index,
          })),
        },
      },
      include: PO_INCLUDE,
    });

    return this.mapPurchaseOrderDetail(created);
  }

  async updatePurchaseOrder(
    user: AuthJwtPayload,
    purchaseOrderId: string,
    dto: UpdatePurchaseOrderDto,
  ) {
    const existing = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (!PO_EDITABLE_STATUSES.includes(existing.status as 'DRAFT')) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Order distributor hanya bisa diubah saat status DRAFT.',
      });
    }

    if (dto.supplierId) {
      await this.ensureSupplierActive(user.tenantId, dto.supplierId);
    }

    const preparedItems = dto.items ? await this.prepareLineItems(user.tenantId, dto.items) : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (preparedItems) {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId } });
      }

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          ...(dto.supplierId ? { supplierId: dto.supplierId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
          ...(dto.expectedDeliveryAt !== undefined
            ? {
                expectedDeliveryAt: dto.expectedDeliveryAt
                  ? new Date(dto.expectedDeliveryAt)
                  : null,
              }
            : {}),
          ...(preparedItems
            ? {
                items: {
                  create: preparedItems.map((item, index) => ({
                    productId: item.productId,
                    unitId: item.unitId,
                    orderedQuantity: new Decimal(item.quantity),
                    receivedQuantity: new Decimal(0),
                    unitCost: new Decimal(item.unitCost),
                    lineTotal: new Decimal(item.lineTotal),
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: PO_INCLUDE,
      });
    });

    return this.mapPurchaseOrderDetail(updated as PurchaseOrderWithDetails);
  }

  async submitPurchaseOrder(user: AuthJwtPayload, purchaseOrderId: string) {
    const existing = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (existing.status !== PurchaseOrderStatus.DRAFT) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Hanya order DRAFT yang bisa dikirim ke distributor.',
      });
    }
    if (existing.items.length === 0) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Order harus memiliki minimal satu barang.',
      });
    }

    const now = new Date();
    const updated = await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: PurchaseOrderStatus.ORDERED,
        orderedAt: now,
        submittedById: user.sub,
      },
      include: PO_INCLUDE,
    });

    return this.mapPurchaseOrderDetail(updated as PurchaseOrderWithDetails);
  }

  async cancelPurchaseOrder(user: AuthJwtPayload, purchaseOrderId: string) {
    const existing = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (!PO_CANCELLABLE_STATUSES.includes(existing.status as 'DRAFT' | 'ORDERED')) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Order tidak bisa dibatalkan pada status ini.',
      });
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: PO_INCLUDE,
    });

    return this.mapPurchaseOrderDetail(updated as PurchaseOrderWithDetails);
  }

  async receivePurchaseOrder(
    user: AuthJwtPayload,
    purchaseOrderId: string,
    dto: ReceivePurchaseOrderDto,
  ) {
    const po = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (!PO_RECEIVABLE_STATUSES.includes(po.status as 'ORDERED' | 'PARTIALLY_RECEIVED')) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Order harus berstatus ORDERED atau PARTIALLY_RECEIVED untuk diterima.',
      });
    }

    const itemMap = new Map(po.items.map((item) => [item.id, item]));
    const receiveNote = dto.notes?.trim() || `Penerimaan ${po.orderNo}`;
    const receivedAt = dto.receivedAt ? new Date(dto.receivedAt) : new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.purchaseOrderReceipt.create({
        data: {
          purchaseOrderId,
          receivedAt,
          notes: receiveNote,
          createdById: user.sub,
        },
      });

      for (const line of dto.items) {
        const poItem = itemMap.get(line.purchaseOrderItemId);
        if (!poItem) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.INVALID_INPUT,
            message: 'Baris order tidak valid.',
          });
        }

        const orderedQty = Number(poItem.orderedQuantity);
        const alreadyReceived = Number(poItem.receivedQuantity);
        const remaining = orderedQty - alreadyReceived;
        if (line.quantityReceived > remaining + 1e-9) {
          throw new ConflictException({
            code: ErrorCodes.INVALID_QUANTITY,
            message: `Jumlah diterima melebihi sisa order untuk ${poItem.product.sku}. Sisa: ${remaining}.`,
          });
        }

        const unitCost = line.unitCost ?? Number(poItem.unitCost);
        const product = poItem.product as ProductWithUnits;
        const purchaseConversions = mapPrismaUnitConversions(product.unitConversions);
        const lineUnitId = poItem.unitId ?? product.unitId;
        let baseQuantity = line.quantityReceived;
        let receiveUnitLabel = poItem.unit?.symbol ?? product.unit?.symbol ?? 'base';

        if (lineUnitId && product.unitId && lineUnitId !== product.unitId) {
          baseQuantity = convertToBaseQuantity(
            line.quantityReceived,
            lineUnitId,
            product.unitId,
            purchaseConversions,
          );
          receiveUnitLabel = poItem.unit?.symbol ?? receiveUnitLabel;
        }

        const conversionToBase =
          lineUnitId && product.unitId && lineUnitId !== product.unitId
            ? purchaseConversions.find((row) => row.unitId === lineUnitId)?.conversionToBase ?? 1
            : 1;
        const baseCostApplied = deriveBaseCostFromPurchaseCost(unitCost, conversionToBase);

        const delta = new Decimal(baseQuantity);
        const existingInv = await tx.inventoryItem.findUnique({
          where: {
            outletId_productId: { outletId: po.outletId, productId: poItem.productId },
          },
        });
        const quantityBefore = new Decimal(existingInv?.quantity ?? 0);
        const quantityAfter = quantityBefore.add(delta);

        if (existingInv) {
          await tx.inventoryItem.update({
            where: { id: existingInv.id },
            data: { quantity: quantityAfter },
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              outletId: po.outletId,
              productId: poItem.productId,
              quantity: quantityAfter,
              minStock: new Decimal(0),
            },
          });
        }

        const lineNote = `${line.quantityReceived} ${receiveUnitLabel} (= ${baseQuantity} ${product.unit?.symbol ?? 'base'})`;
        await tx.stockMovement.create({
          data: {
            outletId: po.outletId,
            productId: poItem.productId,
            type: 'PURCHASE',
            quantity: delta,
            quantityBefore,
            quantityAfter,
            referenceType: 'purchase_order',
            referenceId: purchaseOrderId,
            notes: `${receiveNote} | ${lineNote}`,
            createdById: user.sub,
          },
        });

        if (baseCostApplied > 0) {
          const existingBaseCost = Number(product.costPrice);
          const existingBaseQty = Number(quantityBefore);
          const weightedBaseCost = computeWeightedAverageBaseCost(
            existingBaseQty,
            existingBaseCost,
            baseQuantity,
            baseCostApplied,
          );
          await tx.product.update({
            where: { id: poItem.productId },
            data: { costPrice: new Decimal(weightedBaseCost) },
          });
        }

        const newReceivedQty = alreadyReceived + line.quantityReceived;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQuantity: new Decimal(newReceivedQty) },
        });

        await tx.purchaseOrderReceiptLine.create({
          data: {
            receiptId: receipt.id,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            quantityReceived: new Decimal(line.quantityReceived),
            unitCost: new Decimal(unitCost),
            baseQuantityAdded: new Decimal(baseQuantity),
            baseCostApplied: new Decimal(baseCostApplied),
          },
        });

        poItem.receivedQuantity = new Decimal(newReceivedQty);
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
      });
      const allReceived = refreshedItems.every(
        (item) => Number(item.receivedQuantity) + 1e-9 >= Number(item.orderedQuantity),
      );
      const anyReceived = refreshedItems.some((item) => Number(item.receivedQuantity) > 0);

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: allReceived
            ? PurchaseOrderStatus.RECEIVED
            : anyReceived
              ? PurchaseOrderStatus.PARTIALLY_RECEIVED
              : po.status,
          receivedAt: allReceived ? receivedAt : po.receivedAt,
        },
        include: PO_INCLUDE,
      });
    });

    const detail = this.mapPurchaseOrderDetail(updated as PurchaseOrderWithDetails);

    if (detail.status === 'RECEIVED' || detail.status === 'PARTIALLY_RECEIVED') {
      try {
        await this.payablesService.createFromPurchaseOrder(user, purchaseOrderId, {});
      } catch (error) {
        const response =
          error instanceof UnprocessableEntityException || error instanceof ConflictException
            ? (error.getResponse() as { code?: string })
            : null;
        if (response?.code !== ErrorCodes.DUPLICATE_ENTRY) {
          throw error;
        }
      }
    }

    return detail;
  }

  async listPurchaseOrderReturns(user: AuthJwtPayload, purchaseOrderId: string) {
    const po = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    const returns = await this.prisma.purchaseOrderReturn.findMany({
      where: { tenantId: user.tenantId, purchaseOrderId: po.id },
      include: RETURN_INCLUDE,
      orderBy: [{ returnedAt: 'desc' }],
    });
    return returns.map((row) => this.mapPurchaseOrderReturnDetail(row));
  }

  async getPurchaseOrderReturn(user: AuthJwtPayload, returnId: string) {
    const row = await this.prisma.purchaseOrderReturn.findFirst({
      where: { id: returnId, tenantId: user.tenantId },
      include: RETURN_INCLUDE,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Retur order distributor tidak ditemukan.',
      });
    }
    this.assertPoOutletAccess(user, row.purchaseOrder.outlet.id);
    return this.mapPurchaseOrderReturnDetail(row);
  }

  async createPurchaseOrderReturn(
    user: AuthJwtPayload,
    purchaseOrderId: string,
    dto: CreatePurchaseOrderReturnDto,
  ) {
    const po = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (!PO_RETURNABLE_STATUSES.includes(po.status as 'PARTIALLY_RECEIVED' | 'RECEIVED')) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Retur hanya bisa dilakukan setelah barang diterima (PARTIALLY_RECEIVED atau RECEIVED).',
      });
    }

    const itemMap = new Map(po.items.map((item) => [item.id, item]));
    const returnNote = dto.notes?.trim() || `Retur ${po.orderNo}`;
    const returnedAt = dto.returnedAt ? new Date(dto.returnedAt) : new Date();
    const returnNo = await this.nextReturnNo(user.tenantId);

    const created = await this.prisma.$transaction(async (tx) => {
      const returnRecord = await tx.purchaseOrderReturn.create({
        data: {
          tenantId: user.tenantId,
          purchaseOrderId,
          returnNo,
          notes: returnNote,
          returnedAt,
          createdById: user.sub,
        },
      });

      for (const line of dto.items) {
        const poItem = itemMap.get(line.purchaseOrderItemId);
        if (!poItem) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.INVALID_INPUT,
            message: 'Baris order tidak valid.',
          });
        }

        const receivedQty = Number(poItem.receivedQuantity);
        const alreadyReturned = Number(poItem.returnedQuantity);
        const returnable = receivedQty - alreadyReturned;
        if (line.quantityReturned > returnable + 1e-9) {
          throw new ConflictException({
            code: ErrorCodes.INVALID_QUANTITY,
            message: `Jumlah retur melebihi qty yang bisa diretur untuk ${poItem.product.sku}. Maks: ${returnable}.`,
          });
        }

        const product = poItem.product as ProductWithUnits;
        const purchaseConversions = mapPrismaUnitConversions(product.unitConversions);
        const lineUnitId = poItem.unitId ?? product.unitId;
        let baseQuantity = line.quantityReturned;
        let returnUnitLabel = poItem.unit?.symbol ?? product.unit?.symbol ?? 'base';

        if (lineUnitId && product.unitId && lineUnitId !== product.unitId) {
          baseQuantity = convertToBaseQuantity(
            line.quantityReturned,
            lineUnitId,
            product.unitId,
            purchaseConversions,
          );
          returnUnitLabel = poItem.unit?.symbol ?? returnUnitLabel;
        }

        const unitCost = Number(poItem.unitCost);
        const delta = new Decimal(baseQuantity).neg();
        const existingInv = await tx.inventoryItem.findUnique({
          where: {
            outletId_productId: { outletId: po.outletId, productId: poItem.productId },
          },
        });
        const quantityBefore = new Decimal(existingInv?.quantity ?? 0);
        const quantityAfter = quantityBefore.add(delta);

        if (Number(quantityAfter) < -1e-9) {
          throw new ConflictException({
            code: ErrorCodes.INSUFFICIENT_STOCK,
            message: `Stok ${poItem.product.sku} tidak mencukupi untuk retur. Tersedia: ${Number(quantityBefore)}.`,
          });
        }

        if (existingInv) {
          await tx.inventoryItem.update({
            where: { id: existingInv.id },
            data: { quantity: quantityAfter },
          });
        } else {
          throw new ConflictException({
            code: ErrorCodes.INSUFFICIENT_STOCK,
            message: `Stok ${poItem.product.sku} tidak tersedia untuk retur.`,
          });
        }

        const lineNote = `${line.quantityReturned} ${returnUnitLabel} (= ${baseQuantity} ${product.unit?.symbol ?? 'base'})`;
        await tx.stockMovement.create({
          data: {
            outletId: po.outletId,
            productId: poItem.productId,
            type: 'PURCHASE_RETURN',
            quantity: delta,
            quantityBefore,
            quantityAfter,
            referenceType: 'purchase_order_return',
            referenceId: returnRecord.id,
            notes: `${returnNote} | ${lineNote} | ${line.reason}`,
            createdById: user.sub,
          },
        });

        const newReturnedQty = alreadyReturned + line.quantityReturned;
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { returnedQuantity: new Decimal(newReturnedQty) },
        });

        await tx.purchaseOrderReturnLine.create({
          data: {
            returnId: returnRecord.id,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            quantityReturned: new Decimal(line.quantityReturned),
            reason: line.reason,
            baseQuantityRemoved: new Decimal(baseQuantity),
            unitCost: new Decimal(unitCost),
            lineTotal: new Decimal(Math.round(line.quantityReturned * unitCost)),
          },
        });

        poItem.returnedQuantity = new Decimal(newReturnedQty);
      }

      return tx.purchaseOrderReturn.findUniqueOrThrow({
        where: { id: returnRecord.id },
        include: RETURN_INCLUDE,
      });
    });

    return this.mapPurchaseOrderReturnDetail(created);
  }

  async cancelRemainingPurchaseOrder(user: AuthJwtPayload, purchaseOrderId: string) {
    const existing = await this.findPurchaseOrderOrThrow(user, purchaseOrderId);
    if (
      !PO_CANCEL_REMAINING_STATUSES.includes(existing.status as 'ORDERED' | 'PARTIALLY_RECEIVED')
    ) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Batalkan sisa order hanya untuk status ORDERED atau PARTIALLY_RECEIVED.',
      });
    }

    const hasRemaining = existing.items.some(
      (item) => Number(item.orderedQuantity) - Number(item.receivedQuantity) > 1e-9,
    );
    if (!hasRemaining) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Tidak ada sisa order yang belum diterima.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const received = Number(item.receivedQuantity);
        const ordered = Number(item.orderedQuantity);
        if (ordered <= received + 1e-9) continue;

        const unitCost = Number(item.unitCost);
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: {
            orderedQuantity: new Decimal(received),
            lineTotal: new Decimal(Math.round(received * unitCost)),
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
      });
      const anyReceived = refreshedItems.some((item) => Number(item.receivedQuantity) > 0);
      const allReceived = refreshedItems.every(
        (item) =>
          Number(item.receivedQuantity) + 1e-9 >= Number(item.orderedQuantity) &&
          Number(item.orderedQuantity) > 0,
      );
      const allZero = refreshedItems.every((item) => Number(item.orderedQuantity) <= 1e-9);

      let nextStatus = existing.status;
      if (allZero) {
        nextStatus = PurchaseOrderStatus.CANCELLED;
      } else if (allReceived) {
        nextStatus = PurchaseOrderStatus.RECEIVED;
      } else if (anyReceived) {
        nextStatus = PurchaseOrderStatus.PARTIALLY_RECEIVED;
      } else {
        nextStatus = PurchaseOrderStatus.ORDERED;
      }

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: nextStatus,
          ...(allZero ? { cancelledAt: new Date() } : {}),
          ...(allReceived ? { receivedAt: existing.receivedAt ?? new Date() } : {}),
        },
        include: PO_INCLUDE,
      });
    });

    return this.mapPurchaseOrderDetail(updated as PurchaseOrderWithDetails);
  }

  private async prepareLineItems(
    tenantId: string,
    items: CreatePurchaseOrderDto['items'],
  ) {
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        id: { in: productIds },
        isActive: true,
        hasVariants: false,
      },
      select: {
        id: true,
        sku: true,
        unitId: true,
        costPrice: true,
        unitConversions: {
          where: { isPurchaseUnit: true },
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
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

    return items.map((item) => {
      const product = productMap.get(item.productId)!;
      const purchaseConversions = mapPrismaUnitConversions(product.unitConversions);
      const purchaseUnitId =
        item.unitId ?? purchaseConversions.find((row) => row.isPurchaseUnit)?.unitId ?? product.unitId;

      if (purchaseUnitId && product.unitId && purchaseUnitId !== product.unitId) {
        const valid = purchaseConversions.some((row) => row.unitId === purchaseUnitId);
        if (!valid) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.INVALID_INPUT,
            message: `Satuan order tidak valid untuk produk ${product.sku}.`,
          });
        }
      }

      const conversion = purchaseConversions.find((row) => row.unitId === purchaseUnitId);
      const conversionToBase = conversion?.conversionToBase ?? 1;

      let unitCost = item.unitCost;
      if (unitCost <= 0) {
        const baseCost = Number(product.costPrice);
        unitCost =
          purchaseUnitId && product.unitId && purchaseUnitId !== product.unitId
            ? derivePurchaseCostFromBaseCost(baseCost, conversionToBase)
            : baseCost;
      }

      return {
        productId: item.productId,
        unitId: purchaseUnitId ?? null,
        quantity: item.quantity,
        unitCost,
        lineTotal: Math.round(item.quantity * unitCost),
      };
    });
  }

  private async nextOrderNo(tenantId: string): Promise<string> {
    const now = new Date();
    const dateKey = toDateKey(now);
    const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);

    const sequence = await this.prisma.purchaseOrderSequence.upsert({
      where: {
        tenantId_sequenceDate: { tenantId, sequenceDate },
      },
      create: { tenantId, sequenceDate, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    return buildPurchaseOrderNo(dateKey, sequence.lastValue);
  }

  private async nextReturnNo(tenantId: string): Promise<string> {
    const now = new Date();
    const dateKey = toDateKey(now);
    const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);

    const sequence = await this.prisma.purchaseOrderReturnSequence.upsert({
      where: {
        tenantId_sequenceDate: { tenantId, sequenceDate },
      },
      create: { tenantId, sequenceDate, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    return buildPurchaseOrderReturnNo(dateKey, sequence.lastValue);
  }

  private assertPoOutletAccess(user: AuthJwtPayload, outletId: string) {
    assertOutletAccess(user, outletId);
  }

  private async findPurchaseOrderOrThrow(
    user: AuthJwtPayload,
    purchaseOrderId: string,
  ): Promise<PurchaseOrderWithDetails> {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId: user.tenantId },
      include: PO_INCLUDE,
    });

    if (!po) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Order distributor tidak ditemukan.',
      });
    }

    this.assertPoOutletAccess(user, po.outletId);
    return po;
  }

  private mapPurchaseOrderSummary(row: {
    id: string;
    orderNo: string;
    status: PurchaseOrderStatus;
    notes: string | null;
    orderedAt: Date | null;
    expectedDeliveryAt: Date | null;
    receivedAt: Date | null;
    createdAt: Date;
    supplier: { id: string; name: string };
    items: Array<{ lineTotal: Decimal }>;
  }) {
    const subtotal = row.items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    return {
      id: row.id,
      orderNo: row.orderNo,
      status: row.status,
      supplierId: row.supplier.id,
      supplierName: row.supplier.name,
      notes: row.notes,
      orderedAt: row.orderedAt?.toISOString() ?? null,
      expectedDeliveryAt: row.expectedDeliveryAt?.toISOString() ?? null,
      receivedAt: row.receivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      itemCount: row.items.length,
      subtotal,
    };
  }

  private mapPurchaseOrderDetail(po: PurchaseOrderWithDetails) {
    const items = po.items.map((item) => {
      const orderedQuantity = Number(item.orderedQuantity);
      const receivedQuantity = Number(item.receivedQuantity);
      const returnedQuantity = Number(item.returnedQuantity);
      const remainingQuantity = Math.max(0, orderedQuantity - receivedQuantity);
      const returnableQuantity = Math.max(0, receivedQuantity - returnedQuantity);
      const purchaseConversions = mapPrismaUnitConversions(item.product.unitConversions);
      const lineUnitId = item.unitId ?? item.product.unitId;
      const conversionToBase =
        lineUnitId && item.product.unitId && lineUnitId !== item.product.unitId
          ? purchaseConversions.find((row) => row.unitId === lineUnitId)?.conversionToBase ?? 1
          : 1;
      return {
        id: item.id,
        productId: item.productId,
        sku: item.product.sku,
        productName: item.product.name,
        unitId: item.unitId,
        unitSymbol: item.unit?.symbol ?? item.product.unit?.symbol ?? null,
        baseUnitSymbol: item.product.unit?.symbol ?? null,
        conversionToBase,
        orderedQuantity,
        receivedQuantity,
        returnedQuantity,
        remainingQuantity,
        returnableQuantity,
        unitCost: Number(item.unitCost),
        lineTotal: Number(item.lineTotal),
        currentCostPrice: Number(item.product.costPrice),
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      id: po.id,
      orderNo: po.orderNo,
      status: po.status,
      notes: po.notes,
      outlet: po.outlet,
      supplier: po.supplier,
      orderedAt: po.orderedAt?.toISOString() ?? null,
      expectedDeliveryAt: po.expectedDeliveryAt?.toISOString() ?? null,
      receivedAt: po.receivedAt?.toISOString() ?? null,
      cancelledAt: po.cancelledAt?.toISOString() ?? null,
      createdAt: po.createdAt.toISOString(),
      updatedAt: po.updatedAt.toISOString(),
      createdByName: po.createdBy.fullName,
      submittedByName: po.submittedBy?.fullName ?? null,
      itemCount: items.length,
      subtotal,
      items,
      receipts: po.receipts.map((receipt) => ({
        id: receipt.id,
        receivedAt: receipt.receivedAt.toISOString(),
        notes: receipt.notes,
        createdByName: receipt.createdBy.fullName,
        lines: receipt.lines.map((line) => ({
          sku: line.product.sku,
          productName: line.product.name,
          quantityReceived: Number(line.quantityReceived),
          unitCost: Number(line.unitCost),
          baseQuantityAdded: Number(line.baseQuantityAdded),
          baseCostApplied: Number(line.baseCostApplied),
        })),
      })),
      returns: po.returns.map((ret) => ({
        id: ret.id,
        returnNo: ret.returnNo,
        returnedAt: ret.returnedAt.toISOString(),
        notes: ret.notes,
        createdByName: ret.createdBy.fullName,
        subtotal: ret.lines.reduce((sum, line) => sum + Number(line.lineTotal), 0),
        lines: ret.lines.map((line) => ({
          sku: line.product.sku,
          productName: line.product.name,
          quantityReturned: Number(line.quantityReturned),
          reason: line.reason,
          unitCost: Number(line.unitCost),
          lineTotal: Number(line.lineTotal),
          baseQuantityRemoved: Number(line.baseQuantityRemoved),
        })),
      })),
      payable: po.payable
        ? {
            id: po.payable.id,
            amount: Number(po.payable.amount),
            paidAmount: Number(po.payable.paidAmount),
            outstanding: Math.max(0, Number(po.payable.amount) - Number(po.payable.paidAmount)),
            status: po.payable.status,
            dueDate: po.payable.dueDate?.toISOString().slice(0, 10) ?? null,
          }
        : null,
      print: {
        orderNo: po.orderNo,
        orderedAt: po.orderedAt?.toISOString() ?? null,
        expectedDeliveryAt: po.expectedDeliveryAt?.toISOString() ?? null,
        outletName: po.outlet.name,
        outletAddress: po.outlet.address,
        supplierName: po.supplier.name,
        supplierPhone: po.supplier.phone,
        supplierEmail: po.supplier.email,
        supplierAddress: po.supplier.address,
        notes: po.notes,
        subtotal,
        items: items.map((item) => ({
          sku: item.sku,
          productName: item.productName,
          quantity: item.orderedQuantity,
          unitSymbol: item.unitSymbol,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
        })),
      },
    };
  }

  private mapPurchaseOrderReturnDetail(ret: PurchaseOrderReturnWithDetails) {
    const lines = ret.lines.map((line) => ({
      id: line.id,
      sku: line.product.sku,
      productName: line.product.name,
      unitSymbol:
        line.purchaseOrderItem.unit?.symbol ?? line.product.unit?.symbol ?? null,
      baseUnitSymbol: line.product.unit?.symbol ?? null,
      quantityReturned: Number(line.quantityReturned),
      baseQuantityRemoved: Number(line.baseQuantityRemoved),
      reason: line.reason,
      unitCost: Number(line.unitCost),
      lineTotal: Number(line.lineTotal),
    }));
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    return {
      id: ret.id,
      returnNo: ret.returnNo,
      status: ret.status,
      purchaseOrderId: ret.purchaseOrderId,
      orderNo: ret.purchaseOrder.orderNo,
      notes: ret.notes,
      returnedAt: ret.returnedAt.toISOString(),
      createdAt: ret.createdAt.toISOString(),
      createdByName: ret.createdBy.fullName,
      outlet: ret.purchaseOrder.outlet,
      supplier: ret.purchaseOrder.supplier,
      subtotal,
      lines,
      print: {
        returnNo: ret.returnNo,
        orderNo: ret.purchaseOrder.orderNo,
        returnedAt: ret.returnedAt.toISOString(),
        outletName: ret.purchaseOrder.outlet.name,
        outletAddress: ret.purchaseOrder.outlet.address,
        supplierName: ret.purchaseOrder.supplier.name,
        supplierPhone: ret.purchaseOrder.supplier.phone,
        supplierEmail: ret.purchaseOrder.supplier.email,
        supplierAddress: ret.purchaseOrder.supplier.address,
        notes: ret.notes,
        subtotal,
        items: lines.map((line) => ({
          sku: line.sku,
          productName: line.productName,
          quantity: line.quantityReturned,
          unitSymbol: line.unitSymbol,
          reason: line.reason,
          unitCost: line.unitCost,
          lineTotal: line.lineTotal,
        })),
      },
    };
  }

  private async ensureSupplierActive(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, tenantId, isActive: true },
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
