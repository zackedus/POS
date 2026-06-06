import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CustomersService } from './customers.service';

test('CustomersService: findOrCreateByPhone creates new customer', async () => {
  const created: Array<{ tenantId: string; name: string; phone: string }> = [];
  const prisma = {
    customer: {
      findUnique: async () => null,
      create: async ({ data }: { data: { tenantId: string; name: string; phone: string } }) => {
        created.push(data);
        return { id: 'cust-1', ...data, points: 0 };
      },
      update: async () => {
        throw new Error('update should not run');
      },
    },
  };

  const service = new CustomersService(prisma as never);
  const result = await service.findOrCreateByPhone('tenant-1', 'Budi', '081234567890');
  assert.equal(result.id, 'cust-1');
  assert.equal(created[0]?.phone, '6281234567890');
});

test('CustomersService: resolveOptionalCustomerId returns null when phone missing', async () => {
  const service = new CustomersService({ customer: {} } as never);
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
  const service = new CustomersService(prisma as never);
  const id = await service.resolveOptionalCustomerId('tenant-1', {
    customerId: 'cust-2',
  });
  assert.equal(id, 'cust-2');
});

test('CustomersService: earnPointsForCompletedTransaction increments points', async () => {
  let increment = 0;
  const prisma = {
    tenantSettings: {
      findUnique: async () => ({ loyaltyPointsEnabled: true, loyaltyEarnRateIdr: 10_000 }),
    },
    customer: {
      update: async ({ data }: { data: { points: { increment: number } } }) => {
        increment = data.points.increment;
        return { points: 5 };
      },
    },
  };
  const service = new CustomersService(prisma as never);
  const earned = await service.earnPointsForCompletedTransaction('tenant-1', 'cust-1', 25_000);
  assert.equal(earned, 2);
  assert.equal(increment, 2);
});
