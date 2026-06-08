import { UserRole } from '@barokah/shared';

/** Owner & Manager dapat mengakses dashboard admin. */
export function canAccessDashboard(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

/** Owner & Manager dapat mengelola cabang (CRUD). */
export function canManageOutlets(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

/** Hanya Owner yang dapat membuat/menghapus pengguna. */
export function canManageUsers(role: string): boolean {
  return role === UserRole.OWNER;
}

/** Owner & Manager dapat melihat harga modal (HPP). */
export function canViewCostPrice(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

/** Owner & Manager may switch to any active outlet in the tenant. */
export function canAccessAnyTenantOutlet(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

/** Jalur redirect setelah login berhasil. */
export function getPostLoginPath(role: string): '/dashboard' | '/pos' {
  return canAccessDashboard(role) ? '/dashboard' : '/pos';
}
