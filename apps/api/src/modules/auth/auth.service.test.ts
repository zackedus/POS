import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { ErrorCodes } from '@barokah/shared';
import { AuthService } from './auth.service';

test('Auth: login rejects unknown active user with INVALID_CREDENTIALS', async () => {
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };

  const service = new AuthService(
    prisma as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () => service.login({ email: 'unknown@barokah.test', password: 'secret' }),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INVALID_CREDENTIALS);
      return true;
    },
  );
});

test('Auth: refresh maps invalid token to TOKEN_EXPIRED', async () => {
  const jwtService = {
    verifyAsync: async () => {
      throw new Error('invalid token');
    },
  };
  const configService = {
    get: () => 'refresh-secret',
  };
  const prisma = {
    user: {},
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
  );

  await assert.rejects(
    () => service.refresh('not-a-valid-token'),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.TOKEN_EXPIRED);
      return true;
    },
  );
});

test('Auth: getProfile rejects inactive user with UNAUTHORIZED', async () => {
  const prisma = {
    user: {
      findFirst: async () => null,
    },
  };

  const service = new AuthService(
    prisma as never,
    {} as never,
    {} as never,
  );

  await assert.rejects(
    () => service.getProfile('missing-user-id'),
    (error: unknown) => {
      assert.ok(error instanceof UnauthorizedException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.UNAUTHORIZED);
      return true;
    },
  );
});

test('Auth: login sanitizes email and returns profile payload', async () => {
  const prisma = {
    user: {
      findFirst: async ({ where }: { where: { email: string } }) => {
        assert.equal(where.email, 'manager@barokah.test');
        return {
          id: 'user-1',
          email: 'manager@barokah.test',
          fullName: 'Manager Demo',
          role: UserRole.MANAGER,
          tenantId: 'tenant-1',
          passwordHash: '$2b$10$1CcJ7bNmkRc/sExM0jFReuuFKXQXklhs5my3CUyMPBuR1cpQoJ00O', // "secret123"
          tenant: { name: 'Demo Tenant' },
          userOutlets: [{ outletId: 'outlet-1' }],
        };
      },
    },
  };

  const jwtService = {
    signAsync: async () => 'token-value',
  };
  const configService = {
    get: (key: string) => {
      if (key === 'jwt.expiresIn') return '15m';
      if (key === 'jwt.refreshExpiresIn') return '7d';
      if (key === 'jwt.secret') return 'access-secret';
      if (key === 'jwt.refreshSecret') return 'refresh-secret';
      return undefined;
    },
  };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    configService as never,
  );

  const result = await service.login({
    email: '  MANAGER@barokah.test ',
    password: 'secret123',
  });

  assert.equal(result.user.role, UserRole.MANAGER);
  assert.equal(result.user.tenantId, 'tenant-1');
  assert.deepEqual(result.user.outletIds, ['outlet-1']);
  assert.equal(result.tokens.accessToken, 'token-value');
  assert.equal(result.tokens.refreshToken, 'token-value');
});
