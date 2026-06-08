import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../../modules/auth/auth.types';
import { assertOutletAccess, canAccessAnyTenantOutlet, resolveOutletId } from './outlet.util';

function user(role: AuthJwtPayload['role'], outletIds: string[]): AuthJwtPayload {
  return {
    sub: 'user-1',
    email: 'test@barokah.local',
    tenantId: 'tenant-1',
    role,
    outletIds,
  };
}

test('canAccessAnyTenantOutlet: owner and manager have tenant-wide access', () => {
  assert.equal(canAccessAnyTenantOutlet(user('OWNER', ['outlet-a'])), true);
  assert.equal(canAccessAnyTenantOutlet(user('MANAGER', ['outlet-a'])), true);
  assert.equal(canAccessAnyTenantOutlet(user('CASHIER', ['outlet-a'])), false);
});

test('assertOutletAccess: owner/manager may access any outlet in tenant context', () => {
  assert.doesNotThrow(() => assertOutletAccess(user('OWNER', ['outlet-a']), 'outlet-b'));
  assert.doesNotThrow(() => assertOutletAccess(user('MANAGER', ['outlet-a']), 'outlet-b'));
});

test('assertOutletAccess: cashier limited to assigned outlets', () => {
  assert.doesNotThrow(() => assertOutletAccess(user('CASHIER', ['outlet-a']), 'outlet-a'));
  assert.throws(
    () => assertOutletAccess(user('CASHIER', ['outlet-a']), 'outlet-b'),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_PERMISSION);
      return true;
    },
  );
});

test('resolveOutletId: manager resolves switched outlet outside JWT outletIds', () => {
  assert.equal(resolveOutletId(user('MANAGER', ['outlet-a']), 'outlet-b'), 'outlet-b');
});

test('resolveOutletId: cashier cannot resolve unassigned outlet', () => {
  assert.throws(() => resolveOutletId(user('CASHIER', ['outlet-a']), 'outlet-b'));
});
