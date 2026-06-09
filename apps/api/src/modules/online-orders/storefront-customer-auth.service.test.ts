import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { StorefrontCustomerAuthService } from './storefront-customer-auth.service';

function buildService(prisma: Record<string, unknown>, jwt = { signAsync: async () => 'token' }) {
  const creditLimitService = {
    getDefaultCreditLimitDecimal: () => ({ toString: () => '1000000' }),
    logDefaultLimitOnCreate: async () => {},
  };
  const configService = {
    get: (key: string) => (key === 'jwt.refreshSecret' ? 'refresh-secret' : 'access-secret'),
  };
  return new StorefrontCustomerAuthService(
    prisma as never,
    jwt as never,
    configService as never,
    creditLimitService as never,
  );
}

test('StorefrontCustomerAuth: register creates customer with password hash', async () => {
  const created: Array<Record<string, unknown>> = [];
  const customerRow = {
    id: 'cust-1',
    name: 'Budi',
    phone: '081234567890',
    email: null,
    memberCode: 'MBR-TEST',
    points: 0,
    memberSince: new Date(),
    _count: { addresses: 0 },
  };
  const prisma = {
    tenant: {
      findFirst: async () => ({ id: 'tenant-1', name: 'Toko', slug: 'toko-a' }),
    },
    customer: {
      findUnique: async () => null,
      findFirst: async (args?: { where?: Record<string, unknown> }) => {
        if (args?.where && 'memberCode' in args.where) return null;
        return customerRow;
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return customerRow;
      },
      update: async () => {
        throw new Error('update should not run');
      },
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        customer: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            created.push(data);
            return customerRow;
          },
        },
      }),
    customerAddress: { findMany: async () => [] },
  };

  const service = buildService(prisma);
  const result = await service.register('toko-a', {
    name: 'Budi',
    phone: '081234567890',
    password: 'password123',
  });

  assert.equal(result.customer.name, 'Budi');
  assert.ok(created[0]?.passwordHash);
  assert.match(String(created[0]?.memberCode), /^MBR-/);
  assert.ok(result.tokens.accessToken);
});

test('StorefrontCustomerAuth: register rejects duplicate phone with password', async () => {
  const prisma = {
    tenant: { findFirst: async () => ({ id: 'tenant-1', name: 'Toko', slug: 'toko-a' }) },
    customer: {
      findUnique: async () => ({ id: 'cust-1', passwordHash: 'hash' }),
      findFirst: async () => null,
    },
  };
  const service = buildService(prisma);
  await assert.rejects(
    () => service.register('toko-a', { name: 'Budi', phone: '081234567890', password: 'password123' }),
    (err: ConflictException) => err instanceof ConflictException,
  );
});

test('StorefrontCustomerAuth: login validates password', async () => {
  const hash = await bcrypt.hash('password123', 4);
  const customerRow = {
    id: 'cust-1',
    tenantId: 'tenant-1',
    name: 'Budi',
    phone: '081234567890',
    email: null,
    memberCode: 'MBR-ABC',
    points: 10,
    memberSince: new Date(),
    passwordHash: hash,
    _count: { addresses: 1 },
  };
  const prisma = {
    tenant: { findFirst: async () => ({ id: 'tenant-1', name: 'Toko', slug: 'toko-a' }) },
    customer: {
      findFirst: async () => customerRow,
    },
  };

  const service = buildService(prisma);

  const ok = await service.login('toko-a', { identifier: '081234567890', password: 'password123' });
  assert.equal(ok.customer.phone, '081234567890');

  await assert.rejects(
    () => service.login('toko-a', { identifier: '081234567890', password: 'wrongpass' }),
    (err: UnauthorizedException) => err instanceof UnauthorizedException,
  );
});

test('StorefrontCustomerAuth: updateMe updates profile fields', async () => {
  const hash = bcrypt.hashSync('oldpassword', 4);
  let updatedData: Record<string, unknown> | undefined;
  const customerRow = {
    id: 'cust-1',
    tenantId: 'tenant-1',
    name: 'Budi',
    phone: '6281234567890',
    email: 'budi@example.com',
    memberCode: 'MBR-ABC',
    points: 10,
    memberSince: new Date(),
    passwordHash: hash,
    _count: { addresses: 1 },
  };
  const prisma = {
    customer: {
      findFirst: async (args?: { where?: Record<string, unknown>; select?: Record<string, boolean> }) => {
        if (args?.select?.passwordHash) return { passwordHash: hash };
        if (args?.where && 'email' in args.where) return null;
        return customerRow;
      },
      findUnique: async () => null,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updatedData = data;
        Object.assign(customerRow, data);
        return customerRow;
      },
    },
  };

  const service = buildService(prisma);
  const customer = {
    sub: 'cust-1',
    tenantId: 'tenant-1',
    tenantSlug: 'toko-a',
    phone: '6281234567890',
    kind: 'storefront_customer' as const,
  };

  const result = await service.updateMe(customer, 'toko-a', {
    name: 'Budi Baru',
    email: 'baru@example.com',
    phone: '081112223344',
  });

  assert.equal(result.name, 'Budi Baru');
  assert.equal(updatedData?.name, 'Budi Baru');
  assert.equal(updatedData?.email, 'baru@example.com');
  assert.equal(updatedData?.phone, '6281112223344');
});

test('StorefrontCustomerAuth: updateMe changes password when current password valid', async () => {
  const hash = bcrypt.hashSync('oldpassword', 4);
  let updatedData: Record<string, unknown> | undefined;
  const customerRow = {
    id: 'cust-1',
    tenantId: 'tenant-1',
    name: 'Budi',
    phone: '6281234567890',
    email: null,
    memberCode: 'MBR-ABC',
    points: 0,
    memberSince: new Date(),
    passwordHash: hash,
    _count: { addresses: 0 },
  };
  const prisma = {
    customer: {
      findFirst: async (args?: { select?: Record<string, boolean> }) => {
        if (args?.select?.passwordHash) return { passwordHash: hash };
        return customerRow;
      },
      findUnique: async () => null,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updatedData = data;
        return customerRow;
      },
    },
  };

  const service = buildService(prisma);
  const customer = {
    sub: 'cust-1',
    tenantId: 'tenant-1',
    tenantSlug: 'toko-a',
    phone: '6281234567890',
    kind: 'storefront_customer' as const,
  };

  await service.updateMe(customer, 'toko-a', {
    currentPassword: 'oldpassword',
    newPassword: 'newpassword1',
  });

  assert.ok(updatedData?.passwordHash);
  assert.notEqual(updatedData?.passwordHash, hash);
});

test('StorefrontCustomerAuth: address CRUD for authenticated customer', async () => {
  const rows: Array<Record<string, unknown>> = [];
  const prisma = {
    customerAddress: {
      findMany: async () => rows,
      count: async () => rows.length,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'addr-1', createdAt: new Date(), updatedAt: new Date(), ...data };
        rows.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: { id: string } }) => rows.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const idx = rows.findIndex((r) => r.id === where.id);
        rows[idx] = { ...rows[idx], ...data, updatedAt: new Date() };
        return rows[idx];
      },
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = rows.findIndex((r) => r.id === where.id);
        rows.splice(idx, 1);
      },
      updateMany: async () => ({ count: 0 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };

  const service = buildService(prisma);
  const customer = {
    sub: 'cust-1',
    tenantId: 'tenant-1',
    tenantSlug: 'toko-a',
    phone: '081234567890',
    kind: 'storefront_customer' as const,
  };

  const created = await service.createAddress(customer, 'toko-a', {
    label: 'Rumah',
    addressLine1: 'Jl. Merdeka 1',
    city: 'Bandung',
    province: 'Coblong',
    isDefault: true,
  });
  assert.equal(created.label, 'Rumah');
  assert.equal(created.isDefault, true);

  const list = await service.listAddresses(customer, 'toko-a');
  assert.equal(list.addresses.length, 1);

  await service.deleteAddress(customer, 'toko-a', 'addr-1');
  const afterDelete = await service.listAddresses(customer, 'toko-a');
  assert.equal(afterDelete.addresses.length, 0);
});
