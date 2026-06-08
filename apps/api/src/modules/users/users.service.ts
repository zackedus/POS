import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(user: AuthJwtPayload) {
    const rows = await this.prisma.user.findMany({
      where: { tenantId: user.tenantId },
      include: {
        userOutlets: {
          include: { outlet: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: [{ fullName: 'asc' }],
    });

    return rows.map((row) => this.toUserSummary(row));
  }

  async getUser(user: AuthJwtPayload, userId: string) {
    const row = await this.findTenantUser(user.tenantId, userId);
    return this.toUserSummary(row);
  }

  async createUser(actor: AuthJwtPayload, dto: CreateUserDto) {
    this.assertActorCanAssignRole(actor, dto.role);
    await this.ensureOutletsBelongToTenant(actor.tenantId, dto.outletIds);

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: actor.tenantId, email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message: 'Email sudah terdaftar pada tenant ini.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId: actor.tenantId,
          email,
          fullName: dto.fullName.trim(),
          role: dto.role,
          passwordHash,
          isActive: true,
        },
      });

      await tx.userOutlet.createMany({
        data: dto.outletIds.map((outletId) => ({ userId: user.id, outletId })),
      });

      return tx.user.findFirstOrThrow({
        where: { id: user.id },
        include: {
          userOutlets: {
            include: { outlet: { select: { id: true, name: true, code: true } } },
          },
        },
      });
    });

    return this.toUserSummary(created);
  }

  async updateUser(actor: AuthJwtPayload, userId: string, dto: UpdateUserDto) {
    if (actor.sub === userId && dto.isActive === false) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Anda tidak dapat menonaktifkan akun sendiri.',
      });
    }

    const existing = await this.findTenantUser(actor.tenantId, userId);

    if (existing.role === UserRole.OWNER) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Akun owner tidak dapat diubah melalui endpoint ini.',
      });
    }

    this.assertActorCanManageUser(actor, existing.role);
    if (dto.role !== undefined) {
      this.assertActorCanAssignRole(actor, dto.role);
    }
    if (dto.isActive === false) {
      this.assertActorCanDeactivate(actor);
    }

    if (dto.outletIds?.length) {
      await this.ensureOutletsBelongToTenant(actor.tenantId, dto.outletIds);
    }

    const data: {
      fullName?: string;
      role?: UserRole;
      isActive?: boolean;
      passwordHash?: string;
    } = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.user.update({ where: { id: userId }, data });
      }

      if (dto.outletIds) {
        await tx.userOutlet.deleteMany({ where: { userId } });
        await tx.userOutlet.createMany({
          data: dto.outletIds.map((outletId) => ({ userId, outletId })),
        });
      }

      return tx.user.findFirstOrThrow({
        where: { id: userId },
        include: {
          userOutlets: {
            include: { outlet: { select: { id: true, name: true, code: true } } },
          },
        },
      });
    });

    return this.toUserSummary(updated);
  }

  async deactivateUser(actor: AuthJwtPayload, userId: string) {
    this.assertActorCanDeactivate(actor);
    if (actor.sub === userId) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Anda tidak dapat menonaktifkan akun sendiri.',
      });
    }

    const existing = await this.findTenantUser(actor.tenantId, userId);

    if (existing.role === UserRole.OWNER) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Akun owner tidak dapat dinonaktifkan.',
      });
    }

    this.assertActorCanManageUser(actor, existing.role);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
        userOutlets: {
          include: { outlet: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    return this.toUserSummary(updated);
  }

  private async findTenantUser(tenantId: string, userId: string) {
    const row = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        userOutlets: {
          include: { outlet: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Pengguna tidak ditemukan.',
      });
    }

    return row;
  }

  private assertActorCanAssignRole(actor: AuthJwtPayload, targetRole: UserRole) {
    if (actor.role === UserRole.OWNER) {
      if (targetRole === UserRole.OWNER) {
        throw new ForbiddenException({
          code: ErrorCodes.FORBIDDEN,
          message: 'Role pemilik tidak dapat ditetapkan melalui endpoint ini.',
        });
      }
      return;
    }
    if (actor.role === UserRole.MANAGER && targetRole === UserRole.CASHIER) {
      return;
    }
    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: 'Anda tidak memiliki izin untuk menetapkan role ini.',
    });
  }

  private assertActorCanManageUser(actor: AuthJwtPayload, targetRole: UserRole) {
    if (actor.role === UserRole.OWNER) return;
    if (actor.role === UserRole.MANAGER && targetRole === UserRole.CASHIER) return;
    throw new ForbiddenException({
      code: ErrorCodes.FORBIDDEN,
      message: 'Anda hanya dapat mengelola akun kasir.',
    });
  }

  private assertActorCanDeactivate(actor: AuthJwtPayload) {
    if (actor.role !== UserRole.OWNER) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Hanya pemilik yang dapat menonaktifkan pengguna.',
      });
    }
  }

  private async ensureOutletsBelongToTenant(tenantId: string, outletIds: string[]) {
    const uniqueIds = [...new Set(outletIds)];
    const count = await this.prisma.outlet.count({
      where: { tenantId, id: { in: uniqueIds }, isActive: true },
    });

    if (count !== uniqueIds.length) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Salah satu outlet tidak valid untuk tenant ini.',
      });
    }
  }

  private toUserSummary(row: {
    id: string;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    userOutlets: Array<{
      outlet: { id: string; name: string; code: string };
    }>;
  }) {
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
      outlets: row.userOutlets.map((uo) => ({
        id: uo.outlet.id,
        name: uo.outlet.name,
        code: uo.outlet.code,
      })),
    };
  }
}
