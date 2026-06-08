import { UserRole } from '../types/enums';

/** Fixed system permission keys for MVP RBAC (no custom roles in Fase 1–2). */
export type RbacPermissionKey =
  | 'manage_users_roles'
  | 'manage_outlets'
  | 'manage_catalog'
  | 'inventory_opname'
  | 'purchase_orders'
  | 'pos_transactions'
  | 'void_refund'
  | 'reports_export'
  | 'tenant_settings'
  | 'api_integrations'
  | 'customers_members';

export type PermissionLevel = 'full' | 'read' | 'partial' | 'none';

export const RBAC_PERMISSION_KEYS: RbacPermissionKey[] = [
  'manage_users_roles',
  'manage_outlets',
  'manage_catalog',
  'inventory_opname',
  'purchase_orders',
  'pos_transactions',
  'void_refund',
  'reports_export',
  'tenant_settings',
  'api_integrations',
  'customers_members',
];

export const RBAC_PERMISSION_LABELS: Record<RbacPermissionKey, string> = {
  manage_users_roles: 'Kelola user & role',
  manage_outlets: 'Kelola cabang',
  manage_catalog: 'Kelola produk/katalog',
  inventory_opname: 'Inventori & opname',
  purchase_orders: 'PO distributor',
  pos_transactions: 'POS transaksi',
  void_refund: 'Void/refund (approval)',
  reports_export: 'Laporan & export',
  tenant_settings: 'Settings tenant / Midtrans',
  api_integrations: 'Integrasi API',
  customers_members: 'Member/pelanggan',
};

export const RBAC_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'Pemilik',
  [UserRole.MANAGER]: 'Manajer',
  [UserRole.CASHIER]: 'Kasir',
  [UserRole.INVENTORY]: 'Gudang',
  [UserRole.ACCOUNTANT]: 'Akuntan',
};

export const RBAC_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.OWNER]:
    'Akses penuh tenant — kelola staff, cabang, pengaturan, integrasi, dan semua operasional.',
  [UserRole.MANAGER]:
    'Operasional harian & master data — kelola kasir, katalog, stok, laporan; tanpa ubah kebijakan owner.',
  [UserRole.CASHIER]:
    'Kasir toko — transaksi POS, shift, void dengan persetujuan manajer; tanpa akses admin.',
  [UserRole.INVENTORY]:
    'Staff gudang — lihat stok & pergerakan barang; penyesuaian/opname oleh manajer/pemilik.',
  [UserRole.ACCOUNTANT]:
    'Staff keuangan — akses baca laporan penjualan; tanpa operasional kasir atau master data.',
};

/** System-fixed roles exposed in UI (custom roles = Fase 3). */
export const RBAC_SYSTEM_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.CASHIER,
  UserRole.INVENTORY,
  UserRole.ACCOUNTANT,
];

/**
 * Single source of truth for permission matrix.
 * Aligns with NestJS @Roles decorators and users.service assignment rules.
 */
export const RBAC_PERMISSION_MATRIX: Record<UserRole, Record<RbacPermissionKey, PermissionLevel>> = {
  [UserRole.OWNER]: {
    manage_users_roles: 'full',
    manage_outlets: 'full',
    manage_catalog: 'full',
    inventory_opname: 'full',
    purchase_orders: 'full',
    pos_transactions: 'full',
    void_refund: 'full',
    reports_export: 'full',
    tenant_settings: 'full',
    api_integrations: 'full',
    customers_members: 'full',
  },
  [UserRole.MANAGER]: {
    manage_users_roles: 'partial',
    manage_outlets: 'full',
    manage_catalog: 'full',
    inventory_opname: 'full',
    purchase_orders: 'full',
    pos_transactions: 'full',
    void_refund: 'full',
    reports_export: 'full',
    tenant_settings: 'partial',
    api_integrations: 'read',
    customers_members: 'full',
  },
  [UserRole.CASHIER]: {
    manage_users_roles: 'none',
    manage_outlets: 'none',
    manage_catalog: 'none',
    inventory_opname: 'none',
    purchase_orders: 'none',
    pos_transactions: 'full',
    void_refund: 'partial',
    reports_export: 'none',
    tenant_settings: 'none',
    api_integrations: 'none',
    customers_members: 'partial',
  },
  [UserRole.INVENTORY]: {
    manage_users_roles: 'none',
    manage_outlets: 'none',
    manage_catalog: 'none',
    inventory_opname: 'read',
    purchase_orders: 'read',
    pos_transactions: 'none',
    void_refund: 'none',
    reports_export: 'none',
    tenant_settings: 'none',
    api_integrations: 'none',
    customers_members: 'none',
  },
  [UserRole.ACCOUNTANT]: {
    manage_users_roles: 'none',
    manage_outlets: 'none',
    manage_catalog: 'none',
    inventory_opname: 'none',
    purchase_orders: 'none',
    pos_transactions: 'none',
    void_refund: 'none',
    reports_export: 'read',
    tenant_settings: 'none',
    api_integrations: 'none',
    customers_members: 'none',
  },
};

export const RBAC_PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  full: 'Penuh',
  read: 'Baca saja',
  partial: 'Terbatas',
  none: 'Tidak',
};

export const RBAC_PARTIAL_NOTES: Partial<Record<RbacPermissionKey, Partial<Record<UserRole, string>>>> = {
  manage_users_roles: {
    [UserRole.MANAGER]: 'Hanya buat/ubah akun kasir',
  },
  void_refund: {
    [UserRole.CASHIER]: 'Void dengan PIN manajer; refund hanya manajer/pemilik',
  },
  tenant_settings: {
    [UserRole.MANAGER]: 'Tanpa uji Midtrans & kebijakan sensitif owner',
  },
  customers_members: {
    [UserRole.CASHIER]: 'Daftar walk-in & lihat member saat kasir',
  },
};

export function roleHasPermission(role: UserRole, permission: RbacPermissionKey): boolean {
  return RBAC_PERMISSION_MATRIX[role][permission] !== 'none';
}

export function canActorAssignRole(actorRole: UserRole, targetRole: UserRole): boolean {
  if (actorRole === UserRole.OWNER) return targetRole !== UserRole.OWNER;
  if (actorRole === UserRole.MANAGER) return targetRole === UserRole.CASHIER;
  return false;
}

export function getRolesCatalog() {
  return RBAC_SYSTEM_ROLES.map((role) => ({
    id: role,
    label: RBAC_ROLE_LABELS[role],
    description: RBAC_ROLE_DESCRIPTIONS[role],
  }));
}

export function getPermissionMatrixPayload() {
  return {
    permissions: RBAC_PERMISSION_KEYS.map((key) => ({
      key,
      label: RBAC_PERMISSION_LABELS[key],
    })),
    roles: RBAC_SYSTEM_ROLES.map((role) => ({
      id: role,
      label: RBAC_ROLE_LABELS[role],
      description: RBAC_ROLE_DESCRIPTIONS[role],
      permissions: RBAC_PERMISSION_MATRIX[role],
    })),
    levelLabels: RBAC_PERMISSION_LEVEL_LABELS,
    partialNotes: RBAC_PARTIAL_NOTES,
    customRolesPhase: 3,
  };
}
