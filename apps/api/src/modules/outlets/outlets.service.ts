import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import type { Prisma } from '@prisma/client';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateOutletDto } from './dto/create-outlet.dto';
import { UpdateOutletDto } from './dto/update-outlet.dto';

const OUTLET_SELECT = {
  id: true,
  name: true,
  code: true,
  address: true,
  phone: true,
  operatingHours: true,
  isDefault: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOutlets(user: AuthJwtPayload, includeInactive = false) {
    const where: Prisma.OutletWhereInput = this.buildListWhere(user, includeInactive);

    const outlets = await this.prisma.outlet.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      select: {
        ...OUTLET_SELECT,
        _count: {
          select: {
            inventory: true,
            userOutlets: true,
          },
        },
      },
    });

    const activeOutlets = outlets.filter((o) => o.isActive);
    const defaultFromFlag = activeOutlets.find((o) => o.isDefault)?.id ?? null;

    return {
      outlets: outlets.map((outlet) => this.mapOutletSummary(outlet)),
      requiresOutletSelection: activeOutlets.length > 1,
      defaultOutletId:
        defaultFromFlag ??
        (activeOutlets.length === 1 ? (activeOutlets[0]?.id ?? null) : null),
    };
  }

  async getOutletDetail(user: AuthJwtPayload, outletId: string) {
    const outlet = await this.findScopedOutlet(user, outletId, { includeInactive: true });
    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Cabang tidak ditemukan.',
      });
    }

    const [stockSummary, assignedUsers] = await Promise.all([
      this.prisma.inventoryItem.aggregate({
        where: { outletId: outlet.id },
        _count: { _all: true },
        _sum: { quantity: true },
      }),
      this.prisma.userOutlet.findMany({
        where: { outletId: outlet.id },
        select: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ user: { fullName: 'asc' } }],
      }),
    ]);

    const lowStockRows = await this.prisma.inventoryItem.findMany({
      where: {
        outletId: outlet.id,
        minStock: { gt: 0 },
        product: { isActive: true },
      },
      select: {
        quantity: true,
        minStock: true,
      },
    });
    const lowStockCount = lowStockRows.filter(
      (row) => Number(row.quantity) <= Number(row.minStock),
    ).length;

    return {
      ...this.mapOutlet(outlet),
      stockSummary: {
        skuCount: stockSummary._count._all,
        totalQuantity: Number(stockSummary._sum.quantity ?? 0),
        lowStockCount,
      },
      assignedUsers: assignedUsers.map(({ user: assigned }) => ({
        id: assigned.id,
        fullName: assigned.fullName,
        email: assigned.email,
        role: assigned.role,
        isActive: assigned.isActive,
      })),
    };
  }

  async createOutlet(actor: AuthJwtPayload, dto: CreateOutletDto) {
    this.ensureCanManage(actor);
    const code = dto.code.trim().toUpperCase();

    try {
      const outlet = await this.prisma.$transaction(async (tx) => {
        const activeCount = await tx.outlet.count({
          where: { tenantId: actor.tenantId, isActive: true },
        });
        const shouldBeDefault = activeCount === 0;

        const created = await tx.outlet.create({
          data: {
            tenantId: actor.tenantId,
            name: dto.name.trim(),
            code,
            address: dto.address?.trim() || null,
            phone: dto.phone?.trim() || null,
            operatingHours: dto.operatingHours?.trim() || null,
            isActive: true,
            isDefault: shouldBeDefault,
          },
        });

        if (shouldBeDefault) {
          await tx.outlet.updateMany({
            where: { tenantId: actor.tenantId, id: { not: created.id } },
            data: { isDefault: false },
          });
        }

        await tx.userOutlet.create({
          data: { userId: actor.sub, outletId: created.id },
        });

        return created;
      });

      return this.mapOutlet(outlet);
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async updateOutlet(actor: AuthJwtPayload, outletId: string, dto: UpdateOutletDto) {
    this.ensureCanManage(actor);
    const existing = await this.ensureOutletInTenant(actor.tenantId, outletId);

    if (dto.isActive === false) {
      await this.assertCanDeactivate(actor.tenantId, existing);
    }

    if (dto.isDefault === true && dto.isActive === false) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Cabang nonaktif tidak dapat dijadikan cabang utama.',
      });
    }

    try {
      const outlet = await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault === true) {
          await tx.outlet.updateMany({
            where: { tenantId: actor.tenantId },
            data: { isDefault: false },
          });
        }

        if (dto.isActive === false && existing.isDefault) {
          await this.promoteNextDefault(tx, actor.tenantId, outletId);
        }

        return tx.outlet.update({
          where: { id: outletId },
          data: {
            ...(dto.name ? { name: dto.name.trim() } : {}),
            ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
            ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
            ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
            ...(dto.operatingHours !== undefined
              ? { operatingHours: dto.operatingHours?.trim() || null }
              : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          },
        });
      });

      return this.mapOutlet(outlet);
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async setDefaultOutlet(actor: AuthJwtPayload, outletId: string) {
    this.ensureCanManage(actor);
    const existing = await this.ensureOutletInTenant(actor.tenantId, outletId);

    if (!existing.isActive) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Cabang nonaktif tidak dapat dijadikan cabang utama.',
      });
    }

    const outlet = await this.prisma.$transaction(async (tx) => {
      await tx.outlet.updateMany({
        where: { tenantId: actor.tenantId },
        data: { isDefault: false },
      });

      return tx.outlet.update({
        where: { id: outletId },
        data: { isDefault: true, isActive: true },
      });
    });

    return this.mapOutlet(outlet);
  }

  private buildListWhere(user: AuthJwtPayload, includeInactive: boolean): Prisma.OutletWhereInput {
    const base: Prisma.OutletWhereInput = { tenantId: user.tenantId };

    if (user.role === UserRole.OWNER || user.role === UserRole.MANAGER) {
      return {
        ...base,
        ...(includeInactive ? {} : { isActive: true }),
      };
    }

    return {
      ...base,
      isActive: true,
      id: { in: user.outletIds },
    };
  }

  private async findScopedOutlet(
    user: AuthJwtPayload,
    outletId: string,
    options: { includeInactive?: boolean } = {},
  ) {
    const where: Prisma.OutletWhereInput = {
      id: outletId,
      tenantId: user.tenantId,
      ...(options.includeInactive ? {} : { isActive: true }),
    };

    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      if (!user.outletIds.includes(outletId)) {
        return null;
      }
    }

    return this.prisma.outlet.findFirst({
      where,
      select: OUTLET_SELECT,
    });
  }

  private async ensureOutletInTenant(tenantId: string, outletId: string) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId },
      select: {
        id: true,
        isActive: true,
        isDefault: true,
      },
    });

    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Cabang tidak ditemukan.',
      });
    }

    return outlet;
  }

  private async assertCanDeactivate(
    tenantId: string,
    outlet: { id: string; isDefault: boolean },
  ) {
    const activeCount = await this.prisma.outlet.count({
      where: { tenantId, isActive: true },
    });

    if (activeCount <= 1) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CONFLICT,
        message: 'Tidak dapat menonaktifkan satu-satunya cabang aktif.',
      });
    }

    const txCount = await this.prisma.transaction.count({
      where: { outletId: outlet.id },
    });

    if (txCount > 0 && outlet.isDefault) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.CONFLICT,
        message: 'Set cabang utama lain sebelum menonaktifkan cabang default yang memiliki transaksi.',
      });
    }
  }

  private async promoteNextDefault(
    tx: Prisma.TransactionClient,
    tenantId: string,
    excludeOutletId: string,
  ) {
    const nextDefault = await tx.outlet.findFirst({
      where: {
        tenantId,
        isActive: true,
        id: { not: excludeOutletId },
      },
      orderBy: [{ createdAt: 'asc' }],
      select: { id: true },
    });

    if (nextDefault) {
      await tx.outlet.updateMany({
        where: { tenantId },
        data: { isDefault: false },
      });
      await tx.outlet.update({
        where: { id: nextDefault.id },
        data: { isDefault: true },
      });
    }
  }

  private ensureCanManage(actor: AuthJwtPayload) {
    if (actor.role !== UserRole.OWNER && actor.role !== UserRole.MANAGER) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Hanya pemilik atau manager yang dapat mengelola cabang.',
      });
    }
  }

  private mapOutlet(outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    operatingHours: string | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      address: outlet.address,
      phone: outlet.phone,
      operatingHours: outlet.operatingHours,
      isDefault: outlet.isDefault,
      isActive: outlet.isActive,
      createdAt: outlet.createdAt.toISOString(),
      updatedAt: outlet.updatedAt.toISOString(),
    };
  }

  private mapOutletSummary(outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    operatingHours: string | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: { inventory: number; userOutlets: number };
  }) {
    return {
      ...this.mapOutlet(outlet),
      inventorySkuCount: outlet._count.inventory,
      assignedUserCount: outlet._count.userOutlets,
    };
  }

  private handleUniqueError(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: 'Kode cabang sudah digunakan pada tenant ini.',
      });
    }
  }
}
