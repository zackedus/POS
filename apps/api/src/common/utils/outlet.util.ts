import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../../modules/auth/auth.types';

/** Owner & Manager may operate on any active outlet within their tenant. */
export function canAccessAnyTenantOutlet(user: AuthJwtPayload): boolean {
  return user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
}

export function assertOutletAccess(user: AuthJwtPayload, outletId: string): void {
  if (canAccessAnyTenantOutlet(user) || user.outletIds.includes(outletId)) {
    return;
  }
  throw new ForbiddenException({
    code: ErrorCodes.INSUFFICIENT_PERMISSION,
    message: 'Anda tidak memiliki akses ke outlet ini.',
  });
}

export function resolveOutletId(user: AuthJwtPayload, outletId?: string): string {
  if (outletId) {
    assertOutletAccess(user, outletId);
    return outletId;
  }

  if (user.outletIds.length === 1) {
    return user.outletIds[0];
  }

  throw new BadRequestException({
    code: ErrorCodes.INVALID_INPUT,
    message: 'Parameter outletId wajib diisi.',
  });
}
