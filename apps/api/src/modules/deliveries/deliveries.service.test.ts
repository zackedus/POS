import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { DeliveriesService } from './deliveries.service';

function cashierUser(): AuthJwtPayload {
  return {
    sub: 'cashier-1',
    email: 'kasir@barokah.test',
    tenantId: 'tenant-1',
    role: 'CASHIER',
    outletIds: ['outlet-1'],
  };
}

function managerUser(): AuthJwtPayload {
  return { ...cashierUser(), sub: 'manager-1', role: 'MANAGER' };
}

function makeService(prisma: object, customersService: { resolveOptionalCustomerId: (...args: unknown[]) => Promise<string | null> } = {
  resolveOptionalCustomerId: async () => null,
}) {
  return new DeliveriesService(prisma as never, customersService as never);
}

test('Deliveries: updateStatus rejects invalid transition', async () => {
  const prisma = {
    deliveryOrder: {
      findFirst: async () => ({
        id: 'delivery-1',
        status: 'MENUNGGU',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        driverName: null,
        scheduledAt: null,
        notes: null,
        cancelReason: null,
      }),
      update: async () => {
        throw new Error('update should not be called');
      },
    },
  };

  const service = makeService(prisma);
  await assert.rejects(
    () => service.updateStatus(managerUser(), 'delivery-1', { status: 'SELESAI' }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.DELIVERY_STATUS_TRANSITION_INVALID);
      return true;
    },
  );
});

test('Deliveries: updateStatus requires manager role', async () => {
  const prisma = { deliveryOrder: { findFirst: async () => null } };
  const service = makeService(prisma);
  await assert.rejects(
    () => service.updateStatus(cashierUser(), 'delivery-1', { status: 'DISIAPKAN' }),
    (error: unknown) => {
      assert.ok(error instanceof ForbiddenException);
      return true;
    },
  );
});

test('Deliveries: create rejects duplicate delivery for transaction', async () => {
  const prisma = {
    transaction: {
      findFirst: async () => ({
        id: 'trx-1',
        customerId: 'cust-1',
        outletId: 'outlet-1',
        status: 'COMPLETED',
      }),
    },
    deliveryOrder: {
      findFirst: async () => ({ deliveryNo: 'DLV-20260609-0001' }),
    },
    customer: { findFirst: async () => ({ id: 'cust-1' }) },
  };

  const service = makeService(prisma);
  await assert.rejects(
    () =>
      service.create(cashierUser(), {
        transactionId: 'trx-1',
        addressId: 'addr-1',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.DELIVERY_ALREADY_EXISTS);
      return true;
    },
  );
});

test('Deliveries: create requires address or snapshot', async () => {
  const prisma = {
    transaction: {
      findFirst: async () => ({
        id: 'trx-1',
        customerId: 'cust-1',
        outletId: 'outlet-1',
        status: 'COMPLETED',
      }),
    },
    deliveryOrder: { findFirst: async () => null },
    customer: { findFirst: async () => ({ id: 'cust-1' }) },
  };

  const service = makeService(prisma);
  await assert.rejects(
    () => service.create(cashierUser(), { transactionId: 'trx-1' }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.DELIVERY_ADDRESS_REQUIRED);
      return true;
    },
  );
});

test('Deliveries: getById returns not found', async () => {
  const prisma = { deliveryOrder: { findFirst: async () => null } };
  const service = makeService(prisma);
  await assert.rejects(
    () => service.getById(cashierUser(), 'missing'),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});

test('Deliveries: queueSummary aggregates counts', async () => {
  const prisma = {
    deliveryOrder: {
      groupBy: async () => [
        { status: 'MENUNGGU', _count: { _all: 3 } },
        { status: 'DISIAPKAN', _count: { _all: 2 } },
      ],
    },
  };

  const service = makeService(prisma);
  const summary = await service.queueSummary(cashierUser(), {});
  assert.equal(summary.MENUNGGU, 3);
  assert.equal(summary.DISIAPKAN, 2);
  assert.equal(summary.total, 5);
});

test('Deliveries: create resolves walk-in customer from checkout snapshot when transaction has no customerId', async () => {
  let resolvedCustomerId: string | null = null;
  const prisma = {
    transaction: {
      findFirst: async () => ({
        id: 'trx-walkin-1',
        customerId: null,
        outletId: 'outlet-1',
        status: 'COMPLETED',
      }),
    },
    deliveryOrder: {
      findFirst: async () => null,
    },
    customer: {
      findFirst: async () => ({ id: 'cust-walkin-1' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        deliveryOrderSequence: {
          upsert: async () => ({ lastValue: 1 }),
        },
        deliveryOrder: {
          create: async ({
            data,
          }: {
            data: {
              customerId: string;
              deliveryNo: string;
              addressLine1: string;
            };
          }) => ({
            id: 'delivery-walkin-1',
            deliveryNo: data.deliveryNo,
            deliveryType: 'STORE_DIRECT',
            status: 'MENUNGGU',
            createdAt: new Date('2026-06-09T10:00:00.000Z'),
            scheduledAt: null,
            driverName: null,
            notes: null,
            addressLine1: data.addressLine1,
            addressLine2: null,
            addressCity: 'Jakarta',
            addressProvince: null,
            customer: { id: data.customerId, name: 'Pak Joko', phone: '0812987654321' },
            outlet: { id: 'outlet-1', name: 'Toko Utama' },
            transaction: {
              id: 'trx-walkin-1',
              receiptNo: 'TRX-WLK-01',
              total: { toString: () => '70000' },
              items: [{ id: 'item-1' }],
            },
          }),
        },
      }),
  };

  const customersService = {
    resolveOptionalCustomerId: async (...args: unknown[]) => {
      const dto = (args[1] ?? {}) as { customerName?: string; customerPhone?: string };
      resolvedCustomerId =
        dto.customerName === 'Pak Joko' && dto.customerPhone === '0812987654321' ? 'cust-walkin-1' : null;
      return resolvedCustomerId;
    },
  };

  const service = makeService(prisma, customersService);
  const created = await service.create(cashierUser(), {
    transactionId: 'trx-walkin-1',
    customerName: 'Pak Joko',
    customerPhone: '0812987654321',
    addressSnapshot: {
      label: 'Proyek',
      addressLine1: 'Jl. Merdeka 10',
      city: 'Jakarta',
    },
  });

  assert.equal(resolvedCustomerId, 'cust-walkin-1');
  assert.equal(created.deliveryNo, 'DLV-20260609-0001');
  assert.equal(created.customer.id, 'cust-walkin-1');
});
