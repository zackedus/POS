import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@barokah/database';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesController } from './roles.controller';

function getRoles(controller: object, methodName: string): UserRole[] {
  const method = (controller as Record<string, unknown>)[methodName] as (...args: unknown[]) => unknown;
  const methodRoles = Reflect.getMetadata(ROLES_KEY, method) as UserRole[] | undefined;
  const classRoles = Reflect.getMetadata(ROLES_KEY, controller.constructor) as UserRole[] | undefined;
  return methodRoles ?? classRoles ?? [];
}

test('Smoke RBAC: roles.list allows MANAGER/OWNER', () => {
  assert.deepEqual(getRoles(RolesController.prototype, 'listRoles'), [UserRole.OWNER, UserRole.MANAGER]);
});
