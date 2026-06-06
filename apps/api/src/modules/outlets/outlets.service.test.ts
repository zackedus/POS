import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserRole } from '@barokah/database';
import type { AuthJwtPayload } from '../auth/auth.types';
import { OutletsService } from './outlets.service';

function ownerUser(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.OWNER,
    outletIds: ['outlet-1'],
  };
}

test('Outlets: listOutlets returns outlets for owner', async () => {
  const prisma = {
    outlet: {
      findMany: async () => [
        { id: 'outlet-1', name: 'Toko Utama', code: 'MAIN', address: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ],
    },
  };

  const service = new OutletsService(prisma as never);
  const result = await service.listOutlets(ownerUser());

  assert.equal(result.outlets.length, 1);
  assert.equal(result.outlets[0]?.code, 'MAIN');
});

test('Outlets: createOutlet assigns owner to new outlet', async () => {
  let userOutletCreated = false;
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        outlet: {
          create: async () => ({
            id: 'outlet-2',
            name: 'Cabang Utara',
            code: 'NORTH',
            address: 'Jl. Utara',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        userOutlet: {
          create: async () => {
            userOutletCreated = true;
            return {};
          },
        },
      }),
  };

  const service = new OutletsService(prisma as never);
  const result = await service.createOutlet(ownerUser(), {
    name: 'Cabang Utara',
    code: 'north',
    address: 'Jl. Utara',
  });

  assert.equal(result.code, 'NORTH');
  assert.equal(userOutletCreated, true);
});
