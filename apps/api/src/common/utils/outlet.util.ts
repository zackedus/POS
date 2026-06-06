import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../../modules/auth/auth.types';

export function resolveOutletId(user: AuthJwtPayload, outletId?: string): string {
  if (outletId) {
    if (user.role !== UserRole.OWNER && !user.outletIds.includes(outletId)) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Anda tidak memiliki akses ke outlet ini.',
      });
    }
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
