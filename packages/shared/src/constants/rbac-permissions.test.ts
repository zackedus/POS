import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '../types/enums';
import {
  RBAC_PERMISSION_KEYS,
  RBAC_PERMISSION_MATRIX,
  RBAC_SYSTEM_ROLES,
  canActorAssignRole,
  getPermissionMatrixPayload,
  getRolesCatalog,
  roleHasPermission,
} from './rbac-permissions';

test('RBAC: every system role has all permission keys defined', () => {
  for (const role of RBAC_SYSTEM_ROLES) {
    for (const key of RBAC_PERMISSION_KEYS) {
      assert.ok(
        RBAC_PERMISSION_MATRIX[role][key],
        `Missing matrix entry for ${role}.${key}`,
      );
    }
  }
});

test('RBAC: owner has full access on admin permissions', () => {
  assert.equal(roleHasPermission(UserRole.OWNER, 'manage_users_roles'), true);
  assert.equal(roleHasPermission(UserRole.OWNER, 'api_integrations'), true);
  assert.equal(RBAC_PERMISSION_MATRIX[UserRole.OWNER].tenant_settings, 'full');
});

test('RBAC: cashier cannot manage users or settings', () => {
  assert.equal(roleHasPermission(UserRole.CASHIER, 'manage_users_roles'), false);
  assert.equal(roleHasPermission(UserRole.CASHIER, 'tenant_settings'), false);
  assert.equal(roleHasPermission(UserRole.CASHIER, 'pos_transactions'), true);
});

test('RBAC: manager can assign cashier only; owner cannot assign owner', () => {
  assert.equal(canActorAssignRole(UserRole.OWNER, UserRole.MANAGER), true);
  assert.equal(canActorAssignRole(UserRole.OWNER, UserRole.OWNER), false);
  assert.equal(canActorAssignRole(UserRole.MANAGER, UserRole.CASHIER), true);
  assert.equal(canActorAssignRole(UserRole.MANAGER, UserRole.MANAGER), false);
});

test('RBAC: catalog payload includes roles and permissions', () => {
  const roles = getRolesCatalog();
  assert.equal(roles.length, RBAC_SYSTEM_ROLES.length);
  assert.ok(roles.some((r) => r.id === UserRole.CASHIER && r.label === 'Kasir'));

  const payload = getPermissionMatrixPayload();
  assert.equal(payload.permissions.length, RBAC_PERMISSION_KEYS.length);
  assert.equal(payload.roles.length, RBAC_SYSTEM_ROLES.length);
  assert.equal(payload.customRolesPhase, 3);
});
