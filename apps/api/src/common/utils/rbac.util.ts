import { UserRole } from '@barokah/database';
import type { AuthJwtPayload } from '../../modules/auth/auth.types';

/** Owner & Manager may view/edit cost (modal/HPP). */
export function canViewCostPrice(user: AuthJwtPayload): boolean {
  return user.role === UserRole.OWNER || user.role === UserRole.MANAGER;
}
