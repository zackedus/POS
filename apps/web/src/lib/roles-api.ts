import {
  getPermissionMatrixPayload,
  getRolesCatalog,
  type PermissionLevel,
  type RbacPermissionKey,
  RBAC_PARTIAL_NOTES,
  RBAC_PERMISSION_LEVEL_LABELS,
  RBAC_ROLE_LABELS,
  UserRole,
} from '@barokah/shared';
import { apiConfig } from './api';
import { authFetch } from './auth';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/roles`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface RolesApiResponse {
  roles: Array<{ id: string; label: string; description: string }>;
  matrix: ReturnType<typeof getPermissionMatrixPayload>;
}

export function getLocalRolesData(): RolesApiResponse {
  return {
    roles: getRolesCatalog(),
    matrix: getPermissionMatrixPayload(),
  };
}

export async function fetchRoles(): Promise<RolesApiResponse> {
  const res = await authFetch(BASE);
  const json = (await res.json()) as ApiEnvelope<RolesApiResponse>;

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat daftar peran.');
  }

  return json.data;
}

export { RBAC_ROLE_LABELS, RBAC_PERMISSION_LEVEL_LABELS, RBAC_PARTIAL_NOTES };
export type { PermissionLevel, RbacPermissionKey, UserRole };

export function permissionLevelVariant(level: PermissionLevel): 'success' | 'warning' | 'info' | 'neutral' {
  if (level === 'full') return 'success';
  if (level === 'partial') return 'warning';
  if (level === 'read') return 'info';
  return 'neutral';
}

export function roleBadgeVariant(role: string): 'success' | 'warning' | 'info' | 'neutral' {
  if (role === UserRole.OWNER) return 'success';
  if (role === UserRole.MANAGER) return 'info';
  if (role === UserRole.CASHIER) return 'warning';
  return 'neutral';
}

export function formatPermissionCell(
  role: UserRole,
  permission: RbacPermissionKey,
  level: PermissionLevel,
): string {
  const label = RBAC_PERMISSION_LEVEL_LABELS[level];
  const note = RBAC_PARTIAL_NOTES[permission]?.[role];
  return note ? `${label} — ${note}` : label;
}
