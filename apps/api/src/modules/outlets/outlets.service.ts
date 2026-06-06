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

@Injectable()
export class OutletsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOutlets(user: AuthJwtPayload, includeInactive = false) {
    const where: Prisma.OutletWhereInput =
      user.role === UserRole.OWNER
        ? {
            tenantId: user.tenantId,
            ...(includeInactive ? {} : { isActive: true }),
          }
        : {
            tenantId: user.tenantId,
            isActive: true,
            id: { in: user.outletIds },
          };

    const outlets = await this.prisma.outlet.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      outlets,
      requiresOutletSelection: outlets.filter((o) => o.isActive).length > 1,
      defaultOutletId:
        outlets.filter((o) => o.isActive).length === 1
          ? (outlets.find((o) => o.isActive)?.id ?? null)
          : null,
    };
  }

  async createOutlet(actor: AuthJwtPayload, dto: CreateOutletDto) {
    const code = dto.code.trim().toUpperCase();

    try {
      const outlet = await this.prisma.$transaction(async (tx) => {
        const created = await tx.outlet.create({
          data: {
            tenantId: actor.tenantId,
            name: dto.name.trim(),
            code,
            address: dto.address?.trim() || null,
            isActive: true,
          },
        });

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
    await this.ensureOwnerCanManage(actor, outletId);

    try {
      const outlet = await this.prisma.outlet.update({
        where: { id: outletId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      return this.mapOutlet(outlet);
    } catch (error) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  private async ensureOwnerCanManage(actor: AuthJwtPayload, outletId: string) {
    if (actor.role !== UserRole.OWNER) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Hanya pemilik yang dapat mengelola cabang.',
      });
    }

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId: actor.tenantId },
      select: { id: true },
    });

    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Cabang tidak ditemukan.',
      });
    }
  }

  private mapOutlet(outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      address: outlet.address,
      isActive: outlet.isActive,
      createdAt: outlet.createdAt.toISOString(),
      updatedAt: outlet.updatedAt.toISOString(),
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
