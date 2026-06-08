import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@barokah/database';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AuthController } from './auth/auth.controller';
import { CatalogController } from './catalog/catalog.controller';
import { ShiftsController } from './shifts/shifts.controller';
import { ReportsController } from './reports/reports.controller';
import { TransactionsController } from './transactions/transactions.controller';
import { SyncController } from './sync/sync.controller';
import { InventoryController } from './inventory/inventory.controller';
import { UsersController } from './users/users.controller';
import { RolesController } from './roles/roles.controller';
import { SuppliersController } from './suppliers/suppliers.controller';

function getRoles(controller: object, methodName: string): UserRole[] {
  const method = (controller as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown;
  const methodRoles = Reflect.getMetadata(ROLES_KEY, method) as UserRole[] | undefined;
  const classRoles = Reflect.getMetadata(ROLES_KEY, controller.constructor) as UserRole[] | undefined;
  return methodRoles ?? classRoles ?? [];
}

test('Smoke RBAC: shifts.forceCloseShift allows MANAGER/OWNER only', () => {
  const roles = getRoles(ShiftsController.prototype, 'forceCloseShift');
  assert.deepEqual(roles, [UserRole.OWNER, UserRole.MANAGER]);
});

test('Smoke RBAC: catalog category write endpoints require MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(CatalogController.prototype, 'createCategory'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(CatalogController.prototype, 'updateCategory'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(CatalogController.prototype, 'deleteCategory'), [UserRole.OWNER, UserRole.MANAGER]);
});

test('Smoke RBAC: catalog product write endpoints require MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(CatalogController.prototype, 'createProduct'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(CatalogController.prototype, 'updateProduct'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(CatalogController.prototype, 'deleteProduct'), [UserRole.OWNER, UserRole.MANAGER]);
});

test('Smoke RBAC: auth.ownerOnly remains OWNER only', () => {
  const roles = getRoles(AuthController.prototype, 'ownerOnly');
  assert.deepEqual(roles, [UserRole.OWNER]);
});

test('Smoke RBAC: reports endpoints require MANAGER/OWNER (class-level)', () => {
  assert.deepEqual(getRoles(ReportsController.prototype, 'getDailySales'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(ReportsController.prototype, 'getDashboard'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(ReportsController.prototype, 'getPaymentMix'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(ReportsController.prototype, 'getShiftSummaries'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(ReportsController.prototype, 'listOutlets'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(ReportsController.prototype, 'exportDailySales'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
});

test('Smoke RBAC: transactions void allows cashier with manager approval (no method role)', () => {
  const roles = getRoles(TransactionsController.prototype, 'voidTransaction');
  assert.deepEqual(roles, []);
});

test('Smoke RBAC: transactions refund requires MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(TransactionsController.prototype, 'refundTransaction'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
});

test('Smoke RBAC: sync endpoints have no method-level role (cashier allowed)', () => {
  assert.deepEqual(getRoles(SyncController.prototype, 'enqueue'), []);
  assert.deepEqual(getRoles(SyncController.prototype, 'getStatus'), []);
  assert.deepEqual(getRoles(SyncController.prototype, 'getConflicts'), []);
});

test('Smoke RBAC: transactions getReceipt has no method-level role (cashier allowed)', () => {
  const roles = getRoles(TransactionsController.prototype, 'getReceipt');
  assert.deepEqual(roles, []);
});

test('Smoke RBAC: inventory list allows INVENTORY role (class-level)', () => {
  assert.deepEqual(getRoles(InventoryController.prototype, 'listInventory'), [
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.INVENTORY,
  ]);
});

test('Smoke RBAC: inventory adjust requires MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(InventoryController.prototype, 'adjustStock'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
});

test('Smoke RBAC: users write endpoints — create/update OWNER+MANAGER, deactivate OWNER only', () => {
  assert.deepEqual(getRoles(UsersController.prototype, 'createUser'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(UsersController.prototype, 'updateUser'), [UserRole.OWNER, UserRole.MANAGER]);
  assert.deepEqual(getRoles(UsersController.prototype, 'deactivateUser'), [UserRole.OWNER]);
});

test('Smoke RBAC: users list allows MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(UsersController.prototype, 'listUsers'), [UserRole.OWNER, UserRole.MANAGER]);
});

test('Smoke RBAC: roles list allows MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(RolesController.prototype, 'listRoles'), [UserRole.OWNER, UserRole.MANAGER]);
});

test('Smoke RBAC: suppliers and purchase receive require MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(SuppliersController.prototype, 'listSuppliers'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
  assert.deepEqual(getRoles(SuppliersController.prototype, 'receivePurchase'), [
    UserRole.OWNER,
    UserRole.MANAGER,
  ]);
});
