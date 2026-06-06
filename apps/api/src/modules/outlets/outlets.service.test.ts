import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnprocessableEntityException } from '@nestjs/common';
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

function managerUser(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.MANAGER,
    outletIds: ['outlet-1'],
  };
}

function cashierUser(): AuthJwtPayload {
  return {
    sub: 'cashier-1',
    email: 'kasir@barokah.test',
    tenantId: 'tenant-1',
    role: UserRole.CASHIER,
    outletIds: ['outlet-1'],
  };
}

const baseOutlet = {
  id: 'outlet-1',
  name: 'Toko Utama',
  code: 'MAIN',
  address: 'Jl. Contoh',
  phone: '021-111',
  operatingHours: '08:00-17:00',
  isDefault: true,
  isActive: true,
  createdAt: new Date('2026-06-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

test('Outlets: listOutlets returns outlets for owner with default flag', async () => {
  const prisma = {
    outlet: {
      findMany: async () => [
        {
          ...baseOutlet,
          _count: { inventory: 12, userOutlets: 2 },
        },
      ],
    },
  };

  const service = new OutletsService(prisma as never);
  const result = await service.listOutlets(ownerUser());

  assert.equal(result.outlets.length, 1);
  assert.equal(result.outlets[0]?.isDefault, true);
  assert.equal(result.defaultOutletId, 'outlet-1');
  assert.equal(result.outlets[0]?.inventorySkuCount, 12);
});

test('Outlets: listOutlets scopes cashier to assigned outlets', async () => {
  let capturedWhere: unknown;
  const prisma = {
    outlet: {
      findMany: async (args: { where: unknown }) => {
        capturedWhere = args.where;
        return [];
      },
    },
  };

  const service = new OutletsService(prisma as never);
  await service.listOutlets(cashierUser());

  assert.deepEqual(capturedWhere, {
    tenantId: 'tenant-1',
    isActive: true,
    id: { in: ['outlet-1'] },
  });
});

test('Outlets: createOutlet assigns owner and sets default when first outlet', async () => {
  let userOutletCreated = false;
  let createdDefault = false;
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        outlet: {
          count: async () => 0,
          create: async (args: { data: { isDefault: boolean } }) => {
            createdDefault = args.data.isDefault;
            return baseOutlet;
          },
          updateMany: async () => ({ count: 0 }),
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
    phone: '021-222',
    operatingHours: '08:00-16:00',
  });

  assert.equal(result.code, 'MAIN');
  assert.equal(createdDefault, true);
  assert.equal(userOutletCreated, true);
});

test('Outlets: updateOutlet blocks deactivating only active outlet', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-1', isActive: true, isDefault: true }),
      count: async () => 1,
    },
    transaction: { count: async () => 0 },
  };

  const service = new OutletsService(prisma as never);
  await assert.rejects(
    () => service.updateOutlet(ownerUser(), 'outlet-1', { isActive: false }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Outlets: setDefaultOutlet clears other defaults', async () => {
  let cleared = false;
  const prisma = {
    outlet: {
      findFirst: async () => ({ id: 'outlet-2', isActive: true, isDefault: false }),
      updateMany: async () => {
        cleared = true;
        return { count: 1 };
      },
      update: async () => ({ ...baseOutlet, id: 'outlet-2', isDefault: true }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        outlet: {
          updateMany: async () => {
            cleared = true;
            return { count: 1 };
          },
          update: async () => ({ ...baseOutlet, id: 'outlet-2', isDefault: true }),
        },
      }),
  };

  const service = new OutletsService(prisma as never);
  const result = await service.setDefaultOutlet(managerUser(), 'outlet-2');

  assert.equal(cleared, true);
  assert.equal(result.isDefault, true);
});

test('Outlets: manager can create outlet', async () => {
  const prisma = {
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        outlet: {
          count: async () => 1,
          create: async () => ({ ...baseOutlet, id: 'outlet-3', code: 'SOUTH', isDefault: false }),
          updateMany: async () => ({ count: 0 }),
        },
        userOutlet: {
          create: async () => ({}),
        },
      }),
  };

  const service = new OutletsService(prisma as never);
  const result = await service.createOutlet(managerUser(), {
    name: 'Cabang Selatan',
    code: 'SOUTH',
  });

  assert.equal(result.code, 'SOUTH');
});

test('Outlets: getOutletDetail returns stock summary and assigned users', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => baseOutlet,
    },
    inventoryItem: {
      aggregate: async () => ({ _count: { _all: 5 }, _sum: { quantity: 120 } }),
      findMany: async () => [
        { quantity: 2, minStock: 5 },
        { quantity: 10, minStock: 3 },
      ],
    },
    userOutlet: {
      findMany: async () => [
        {
          user: {
            id: 'u1',
            fullName: 'Kasir Demo',
            email: 'kasir@barokah.local',
            role: UserRole.CASHIER,
            isActive: true,
          },
        },
      ],
    },
  };

  const service = new OutletsService(prisma as never);
  const detail = await service.getOutletDetail(ownerUser(), 'outlet-1');

  assert.equal(detail.stockSummary.skuCount, 5);
  assert.equal(detail.stockSummary.lowStockCount, 1);
  assert.equal(detail.assignedUsers.length, 1);
});
