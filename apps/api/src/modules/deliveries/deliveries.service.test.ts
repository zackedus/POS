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

  const service = new DeliveriesService(prisma as never);
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
  const service = new DeliveriesService(prisma as never);
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

  const service = new DeliveriesService(prisma as never);
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

  const service = new DeliveriesService(prisma as never);
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
  const service = new DeliveriesService(prisma as never);
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

  const service = new DeliveriesService(prisma as never);
  const summary = await service.queueSummary(cashierUser(), {});
  assert.equal(summary.MENUNGGU, 3);
  assert.equal(summary.DISIAPKAN, 2);
  assert.equal(summary.total, 5);
});
