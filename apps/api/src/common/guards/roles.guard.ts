import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '@barokah/shared';
import { UserRole } from '@barokah/database';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthJwtPayload } from '../../modules/auth/auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: AuthJwtPayload }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        code: ErrorCodes.INSUFFICIENT_PERMISSION,
        message: 'Anda tidak memiliki izin untuk mengakses fitur ini.',
      });
    }

    return true;
  }
}
