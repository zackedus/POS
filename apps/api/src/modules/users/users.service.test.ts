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
