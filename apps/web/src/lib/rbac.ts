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

/** Owner & Manager dapat mengakses halaman admin (list users, create kasir). */
export function canAccessAdminUsers(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
}

/** Owner dapat membuat semua role staff; Manager hanya kasir. */
export function canCreateUser(actorRole: string): boolean {
  return actorRole === UserRole.OWNER || actorRole === UserRole.MANAGER;
}

export function canAssignRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === UserRole.OWNER) return targetRole !== UserRole.OWNER;
  if (actorRole === UserRole.MANAGER) return targetRole === UserRole.CASHIER;
  return false;
}

export function canEditUser(actorRole: string, targetRole: string): boolean {
  if (targetRole === UserRole.OWNER) return false;
  if (actorRole === UserRole.OWNER) return true;
  if (actorRole === UserRole.MANAGER) return targetRole === UserRole.CASHIER;
  return false;
}

export function canDeactivateUser(role: string): boolean {
  return role === UserRole.OWNER;
}

/** Owner & Manager dapat CRUD pelanggan di dashboard. */
export function canManageCustomers(role: string): boolean {
  return role === UserRole.OWNER || role === UserRole.MANAGER;
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
