import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import type { AuthJwtPayload } from '../auth/auth.types';
import { UsersService } from './users.service';

function createOwner(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: 'OWNER',
    outletIds: ['outlet-1', 'outlet-2'],
  };
}

test('Users: updateUser blocks deactivating self', async () => {
  const prisma = {
    user: {
      findFirst: async () => ({
        id: 'owner-1',
        email: 'owner@barokah.test',
        fullName: 'Owner',
        role: 'OWNER',
        isActive: true,
        createdAt: new Date(),
        userOutlets: [],
      }),
    },
  };

  const service = new UsersService(prisma as never);
  await assert.rejects(
    () => service.updateUser(createOwner(), 'owner-1', { isActive: false }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('Users: listUsers returns tenant scoped summaries', async () => {
  const prisma = {
    user: {
      findMany: async (args: { where: { tenantId: string } }) => {
        assert.equal(args.where.tenantId, 'tenant-1');
        return [
          {
            id: 'user-1',
            email: 'kasir@barokah.test',
            fullName: 'Kasir A',
            role: 'CASHIER',
            isActive: true,
            createdAt: new Date('2026-06-01T00:00:00.000Z'),
            userOutlets: [
              {
                outlet: { id: 'outlet-1', name: 'Cabang Utama', code: 'MAIN' },
              },
            ],
          },
        ];
      },
      count: async (args: { where: { tenantId: string } }) => {
        assert.equal(args.where.tenantId, 'tenant-1');
        return 1;
      },
    },
  };

  const service = new UsersService(prisma as never);
  const result = await service.listUsers(createOwner());
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.role, 'CASHIER');
  assert.equal(result.items[0]?.outlets[0]?.code, 'MAIN');
  assert.equal(result.meta.total, 1);
});

test('Users: listUsers applies role and search filters', async () => {
  let capturedWhere: Record<string, unknown> | null = null;
  const prisma = {
    user: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        capturedWhere = args.where;
        return [];
      },
      count: async () => 0,
    },
  };

  const service = new UsersService(prisma as never);
  await service.listUsers(createOwner(), { role: 'MANAGER', search: 'budi', isActive: true, page: 1, limit: 10 });

  assert.ok(capturedWhere);
  const where = capturedWhere as unknown as { tenantId: string; role: string; isActive: boolean; OR: unknown[] };
  assert.equal(where.tenantId, 'tenant-1');
  assert.equal(where.role, 'MANAGER');
  assert.equal(where.isActive, true);
  assert.ok(Array.isArray(where.OR));
});
