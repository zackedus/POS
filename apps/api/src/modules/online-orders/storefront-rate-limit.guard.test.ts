import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import { StorefrontRateLimitGuard } from './storefront-rate-limit.guard';

function buildContext(ip: string, tenantSlug: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        ip,
        params: { tenantSlug },
        headers: {},
      }),
    }),
  } as never;
}

test('StorefrontRateLimitGuard: allows requests under limit', () => {
  const guard = new StorefrontRateLimitGuard();
  for (let i = 0; i < 10; i += 1) {
    assert.equal(guard.canActivate(buildContext('127.0.0.1', 'toko-a')), true);
  }
});

test('StorefrontRateLimitGuard: blocks 11th request with 429', () => {
  const guard = new StorefrontRateLimitGuard();
  for (let i = 0; i < 10; i += 1) {
    guard.canActivate(buildContext('10.0.0.5', 'toko-b'));
  }

  assert.throws(
    () => guard.canActivate(buildContext('10.0.0.5', 'toko-b')),
    (error: unknown) => {
      assert.ok(error instanceof HttpException);
      assert.equal(error.getStatus(), 429);
      const payload = error.getResponse() as { code?: string; message?: string };
      assert.equal(payload.code, ErrorCodes.RATE_LIMIT_EXCEEDED);
      assert.match(payload.message ?? '', /Terlalu banyak permintaan/);
      return true;
    },
  );
});
