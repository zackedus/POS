import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CustomersService } from './customers.service';

function makeService(prisma: Record<string, unknown>) {
  const financeCheckout = {
    getCustomerOutstandingReceivableIdr: async () => 0,
    getCustomerDepositBalanceIdr: async () => 0,
  };
  const receivablesService = {
    getCustomerFinanceSummary: async () => ({ customer: {}, finance: null, receivables: [], deposit: null }),
  };
  return new CustomersService(prisma as never, financeCheckout as never, receivablesService as never);
}

test('CustomersService: findOrCreateByPhone creates new customer with member code', async () => {
  const created: Array<{ tenantId: string; name: string; phone: string; memberCode: string }> = [];
  const prisma = {
    customer: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({
        data,
      }: {
        data: { tenantId: string; name: string; phone: string; memberCode: string };
      }) => {
        created.push(data);
        return { id: 'cust-1', ...data, points: 0 };
      },
      update: async () => {
        throw new Error('update should not run');
      },
    },
  };

  const service = makeService(prisma);
  const result = await service.findOrCreateByPhone('tenant-1', 'Budi', '081234567890');
  assert.equal(result.id, 'cust-1');
  assert.equal(created[0]?.phone, '6281234567890');
  assert.match(created[0]?.memberCode ?? '', /^MBR-/);
});

test('CustomersService: resolveOptionalCustomerId returns null when phone missing', async () => {
  const service = makeService({ customer: {} });
  const id = await service.resolveOptionalCustomerId('tenant-1', {
    customerName: 'Ani',
  });
  assert.equal(id, null);
});

test('CustomersService: resolveOptionalCustomerId links by customerId', async () => {
  const prisma = {
    customer: {
      findFirst: async () => ({ id: 'cust-2' }),
    },
  };
  const service = makeService(prisma);
  const id = await service.resolveOptionalCustomerId('tenant-1', {
    customerId: 'cust-2',
  });
  assert.equal(id, 'cust-2');
});

test('CustomersService: earnPointsForCompletedTransaction writes ledger', async () => {
  let increment = 0;
  let ledgerCreated = false;
  const prisma = {
    tenantSettings: {
      findUnique: async () => ({ loyaltyPointsEnabled: true, loyaltyEarnRateIdr: 10_000 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        customer: {
          update: async ({ data }: { data: { points: { increment: number } } }) => {
            increment = data.points.increment;
            return { points: 5 };
          },
        },
        loyaltyPointLedger: {
          create: async () => {
            ledgerCreated = true;
            return {};
          },
        },
      }),
  };
  const service = makeService(prisma);
  const earned = await service.earnPointsForCompletedTransaction('tenant-1', 'cust-1', 25_000, 'tx-1');
  assert.equal(earned, 2);
  assert.equal(increment, 2);
  assert.equal(ledgerCreated, true);
});

test('CustomersService: resolveLoyaltyRedeem rejects over balance', async () => {
  const prisma = {
    tenantSettings: {
      findUnique: async () => ({
        loyaltyPointsEnabled: true,
        loyaltyRedeemEnabled: true,
        loyaltyRedeemValueIdr: 1_000,
        loyaltyRedeemMaxPercent: 50,
      }),
    },
    customer: {
      findFirst: async () => ({ points: 3 }),
    },
  };
  const service = makeService(prisma);
  await assert.rejects(
    () =>
      service.resolveLoyaltyRedeem({
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        pointsRequested: 5,
        netAfterPromoIdr: 100_000,
      }),
    (err: unknown) => {
      assert.ok(err instanceof UnprocessableEntityException);
      const body = err.getResponse() as { code?: string };
      return body.code === 'LOYALTY_INSUFFICIENT_POINTS';
    },
  );
});

test('CustomersService: resolveLoyaltyRedeem returns capped discount', async () => {
  const prisma = {
    tenantSettings: {
      findUnique: async () => ({
        loyaltyPointsEnabled: true,
        loyaltyRedeemEnabled: true,
        loyaltyRedeemValueIdr: 1_000,
        loyaltyRedeemMaxPercent: 50,
      }),
    },
    customer: {
      findFirst: async () => ({ points: 100 }),
    },
  };
  const service = makeService(prisma);
  const result = await service.resolveLoyaltyRedeem({
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    pointsRequested: 100,
    netAfterPromoIdr: 100_000,
  });
  assert.equal(result.discountIdr, 50_000);
  assert.equal(result.pointsRedeemed, 50);
});

test('CustomersService: create rejects duplicate phone', async () => {
  const prisma = {
    customer: {
      findUnique: async () => ({ id: 'existing' }),
    },
  };
  const service = makeService(prisma);
  await assert.rejects(
    () => service.create({ tenantId: 't1', sub: 'u1', role: 'OWNER' } as never, { name: 'Ani', phone: '08123' }),
    (err: unknown) => err instanceof ConflictException,
  );
});

test('CustomersService: registerPublic creates member for active tenant', async () => {
  let created = false;
  const prisma = {
    tenant: {
      findFirst: async () => ({ id: 'tenant-1', name: 'Toko Demo' }),
    },
    customer: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({
        data,
      }: {
        data: { tenantId: string; name: string; phone: string; memberCode: string };
      }) => {
        created = true;
        return { id: 'cust-1', ...data, points: 0, updatedAt: new Date() };
      },
      update: async () => {
        throw new Error('update should not run');
      },
    },
  };
  const service = makeService(prisma);
  const result = await service.registerPublic('toko-demo', { name: 'Budi', phone: '081234567890' });
  assert.equal(created, true);
  assert.equal(result.customer.phone, '6281234567890');
  assert.match(result.message, /staff admin/i);
});

test('CustomersService: lookupByMemberCode returns customer with finance', async () => {
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        name: 'Budi',
        phone: '6281234567890',
        memberCode: 'MBR-TEST1234',
        points: 10,
        creditLimit: null,
      }),
    },
  };
  const service = makeService(prisma);
  const result = await service.lookupByMemberCode('tenant-1', 'MBR-TEST1234');
  assert.ok(result);
  assert.equal(result?.memberCode, 'MBR-TEST1234');
  assert.equal(result?.points, 10);
});

test('CustomersService: getMemberCard returns QR payload', async () => {
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        name: 'Budi',
        memberCode: 'MBR-ABC12345',
        memberSince: new Date('2026-06-01'),
        points: 25,
        tenant: { name: 'Toko Demo', slug: 'toko-demo', logoUrl: null },
      }),
    },
  };
  const service = makeService(prisma);
  const card = await service.getMemberCard(
    { tenantId: 'tenant-1', sub: 'u1', role: 'OWNER' } as never,
    'cust-1',
  );
  assert.equal(card.memberCode, 'MBR-ABC12345');
  assert.match(card.qrPayload, /barokah:member:toko-demo:MBR-ABC12345/);
});

test('CustomersService: createAddress sets first address as default', async () => {
  let createdDefault = false;
  const prisma = {
    customer: {
      findFirst: async () => ({ id: 'cust-1' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        customerAddress: {
          count: async () => 0,
          updateMany: async () => ({ count: 0 }),
          create: async ({ data }: { data: { isDefault: boolean } }) => {
            createdDefault = data.isDefault;
            return {
              id: 'addr-1',
              label: 'Rumah',
              addressLine1: 'Jl. Test 1',
              addressLine2: null,
              city: 'Jakarta',
              province: null,
              postalCode: null,
              isDefault: data.isDefault,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          },
        },
      }),
  };
  const service = makeService(prisma);
  const address = await service.createAddress(
    { tenantId: 'tenant-1', sub: 'u1', role: 'OWNER' } as never,
    'cust-1',
    { label: 'Rumah', addressLine1: 'Jl. Test 1', city: 'Jakarta' },
  );
  assert.equal(createdDefault, true);
  assert.equal(address.isDefault, true);
});

test('CustomersService: deleteAddress throws when not found', async () => {
  const prisma = {
    customer: {
      findFirst: async () => ({ id: 'cust-1' }),
    },
    customerAddress: {
      findFirst: async () => null,
    },
  };
  const service = makeService(prisma);
  await assert.rejects(
    () =>
      service.deleteAddress(
        { tenantId: 'tenant-1', sub: 'u1', role: 'OWNER' } as never,
        'cust-1',
        'addr-missing',
      ),
    (err: unknown) => err instanceof NotFoundException,
  );
});
