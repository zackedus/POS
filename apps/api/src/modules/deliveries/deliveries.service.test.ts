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

function ownerUser(): AuthJwtPayload {
  return { ...cashierUser(), sub: 'owner-1', role: 'OWNER', outletIds: ['outlet-1', 'outlet-2'] };
}

const noopRealtime = {
  emitDeliveryCreated: () => undefined,
  emitDeliveryUpdated: () => undefined,
};

function makeService(
  prisma: object,
  customersService: { resolveOptionalCustomerId: (...args: unknown[]) => Promise<string | null> } = {
    resolveOptionalCustomerId: async () => null,
  },
) {
  return new DeliveriesService(prisma as never, customersService as never, noopRealtime as never);
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

test('Deliveries: updateStatus advances MENUNGGU to DISIAPKAN', async () => {
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
      update: async ({
        data,
      }: {
        data: { status: string; driverName?: string | null };
      }) => ({
        id: 'delivery-1',
        deliveryNo: 'DLV-20260609-0001',
        deliveryType: 'STORE_DIRECT',
        status: data.status,
        createdAt: new Date('2026-06-09T10:00:00.000Z'),
        scheduledAt: null,
        driverName: data.driverName ?? null,
        notes: null,
        addressLine1: 'Jl. A',
        addressLine2: null,
        addressCity: 'Jakarta',
        addressProvince: null,
        customer: { id: 'cust-1', name: 'Budi', phone: '081234567890' },
        outlet: { id: 'outlet-1', name: 'Toko Utama' },
        onlineOrder: null,
        transaction: {
          id: 'trx-1',
          receiptNo: 'TRX-01',
          total: { toString: () => '70000' },
          items: [{ id: 'item-1' }],
        },
      }),
    },
  };

  const service = makeService(prisma);
  const result = await service.updateStatus(managerUser(), 'delivery-1', {
    status: 'DISIAPKAN',
    driverName: 'Andi',
  });
  assert.equal(result.status, 'DISIAPKAN');
  assert.equal(result.driverName, 'Andi');
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

test('Deliveries: list without outletId returns tenant-wide rows for manager', async () => {
  const prisma = {
    deliveryOrder: {
      findMany: async ({ where }: { where: { tenantId: string; outletId?: string } }) => {
        assert.equal(where.tenantId, 'tenant-1');
        assert.equal(where.outletId, undefined);
        return [
          {
            id: 'delivery-1',
            deliveryNo: 'DLV-20260609-0002',
            deliveryType: 'STORE_DIRECT',
            status: 'MENUNGGU',
            createdAt: new Date('2026-06-09T11:00:00.000Z'),
            scheduledAt: null,
            driverName: null,
            notes: null,
            addressLine1: 'Jl. A',
            addressLine2: null,
            addressCity: 'Jakarta',
            addressProvince: null,
            customer: { id: 'cust-1', name: 'Budi', phone: '081234567890' },
            outlet: { id: 'outlet-2', name: 'Cabang 2' },
            onlineOrder: null,
            transaction: {
              id: 'trx-2',
              receiptNo: 'TRX-02',
              total: { toString: () => '50000' },
              items: [{ id: 'item-1' }],
            },
          },
        ];
      },
      count: async () => 1,
    },
  };

  const service = makeService(prisma);
  const result = await service.list(ownerUser(), {});
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.outlet.id, 'outlet-2');
});

test('Deliveries: create then list includes new STORE_DIRECT order with default active filters', async () => {
  const stored: Array<{ id: string; outletId: string; status: string; deliveryNo: string }> = [];
  const prisma = {
    transaction: {
      findFirst: async () => ({
        id: 'trx-pos-1',
        customerId: 'cust-1',
        outletId: 'outlet-1',
        status: 'COMPLETED',
      }),
    },
    deliveryOrder: {
      findFirst: async (args: { where: { transactionId?: string } }) => {
        if (args.where.transactionId) return null;
        return null;
      },
      findMany: async ({ where }: { where: { status: { in: string[] }; outletId: string } }) =>
        stored.filter(
          (row) => row.outletId === where.outletId && where.status.in.includes(row.status),
        ).map((row) => ({
          id: row.id,
          deliveryNo: row.deliveryNo,
          deliveryType: 'STORE_DIRECT',
          status: row.status,
          createdAt: new Date('2026-06-09T12:00:00.000Z'),
          scheduledAt: null,
          driverName: null,
          notes: null,
          addressLine1: 'Jl. POS 1',
          addressLine2: null,
          addressCity: 'Jakarta',
          addressProvince: null,
          customer: { id: 'cust-1', name: 'Budi', phone: '081234567890' },
          outlet: { id: 'outlet-1', name: 'Toko Utama' },
          onlineOrder: null,
          transaction: {
            id: 'trx-pos-1',
            receiptNo: 'TRX-POS-1',
            total: { toString: () => '70000' },
            items: [{ id: 'item-1' }],
          },
        })),
      count: async ({ where }: { where: { status: { in: string[] }; outletId: string } }) =>
        stored.filter(
          (row) => row.outletId === where.outletId && where.status.in.includes(row.status),
        ).length,
    },
    customer: {
      findFirst: async () => ({ id: 'cust-1' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        deliveryOrderSequence: {
          upsert: async () => ({ lastValue: 2 }),
        },
        deliveryOrder: {
          create: async ({
            data,
          }: {
            data: { outletId: string; deliveryNo: string; status: string };
          }) => {
            const row = {
              id: 'delivery-pos-1',
              outletId: data.outletId,
              status: data.status,
              deliveryNo: data.deliveryNo,
            };
            stored.push(row);
            return {
              ...row,
              deliveryType: 'STORE_DIRECT',
              createdAt: new Date('2026-06-09T12:00:00.000Z'),
              scheduledAt: null,
              driverName: null,
              notes: null,
              addressLine1: 'Jl. POS 1',
              addressLine2: null,
              addressCity: 'Jakarta',
              addressProvince: null,
              customer: { id: 'cust-1', name: 'Budi', phone: '081234567890' },
              outlet: { id: 'outlet-1', name: 'Toko Utama' },
              onlineOrder: null,
              transaction: {
                id: 'trx-pos-1',
                receiptNo: 'TRX-POS-1',
                total: { toString: () => '70000' },
                items: [{ id: 'item-1' }],
              },
            };
          },
        },
      }),
  };

  const service = makeService(prisma);
  const created = await service.create(cashierUser(), {
    transactionId: 'trx-pos-1',
    customerId: 'cust-1',
    outletId: 'outlet-1',
    addressSnapshot: {
      label: 'Proyek',
      addressLine1: 'Jl. POS 1',
      city: 'Jakarta',
    },
  });
  assert.equal(created.deliveryNo, 'DLV-20260609-0002');

  const listed = await service.list(cashierUser(), { status: 'MENUNGGU,DISIAPKAN,DIKIRIM' });
  assert.equal(listed.items.length, 1);
  assert.equal(listed.items[0]?.deliveryNo, 'DLV-20260609-0002');
});

test('Deliveries: list date filter uses WIB calendar day bounds', async () => {
  type CapturedWhere = { createdAt?: { gte?: Date; lt?: Date } };
  let capturedWhere: CapturedWhere | undefined;
  const prisma = {
    deliveryOrder: {
      findMany: async ({ where }: { where: CapturedWhere }) => {
        capturedWhere = where;
        return [];
      },
      count: async () => 0,
    },
  };

  const service = makeService(prisma);
  await service.list(cashierUser(), {
    dateFrom: '2026-06-10',
    dateTo: '2026-06-10',
    status: 'MENUNGGU',
  });

  assert.ok(capturedWhere?.createdAt?.gte);
  assert.ok(capturedWhere?.createdAt?.lt);
  assert.equal(capturedWhere!.createdAt!.gte!.toISOString(), '2026-06-09T17:00:00.000Z');
  assert.equal(capturedWhere!.createdAt!.lt!.toISOString(), '2026-06-10T17:00:00.000Z');

  const jakartaMidnightDelivery = new Date('2026-06-09T17:30:00.000Z');
  assert.ok(jakartaMidnightDelivery >= capturedWhere!.createdAt!.gte!);
  assert.ok(jakartaMidnightDelivery < capturedWhere.createdAt!.lt!);
});

test('Deliveries: createForCompletedTransaction creates delivery row when required', async () => {
  let createCalled = false;
  const prisma = {
    deliveryOrder: {
      findFirst: async () => null,
    },
    transaction: {
      findFirst: async () => ({
        id: 'trx-checkout-1',
        customerId: 'cust-1',
        outletId: 'outlet-1',
        status: 'COMPLETED',
      }),
    },
    customer: { findFirst: async () => ({ id: 'cust-1' }) },
    customerAddress: {
      findFirst: async () => ({
        id: 'addr-1',
        label: 'Rumah',
        addressLine1: 'Jl. Checkout 1',
        addressLine2: null,
        city: 'Jakarta',
        province: null,
        postalCode: null,
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        deliveryOrderSequence: {
          upsert: async () => ({ lastValue: 1 }),
        },
        deliveryOrder: {
          create: async () => {
            createCalled = true;
            return {
              id: 'delivery-checkout-1',
              deliveryNo: 'DLV-20260610-0001',
              deliveryType: 'STORE_DIRECT',
              status: 'MENUNGGU',
              createdAt: new Date('2026-06-09T17:30:00.000Z'),
              scheduledAt: null,
              driverName: null,
              notes: null,
              addressLine1: 'Jl. Checkout 1',
              addressLine2: null,
              addressCity: 'Jakarta',
              addressProvince: null,
              customer: { id: 'cust-1', name: 'Budi', phone: '081234567890' },
              outlet: { id: 'outlet-1', name: 'Toko Utama' },
              onlineOrder: null,
              transaction: {
                id: 'trx-checkout-1',
                receiptNo: 'TRX-CHK-1',
                total: { toString: () => '70000' },
                items: [{ id: 'item-1' }],
              },
            };
          },
        },
      }),
  };

  const service = makeService(prisma);
  const result = await service.createForCompletedTransaction(cashierUser(), {
    transactionId: 'trx-checkout-1',
    outletId: 'outlet-1',
    customerId: 'cust-1',
    delivery: { deliveryRequired: true, deliveryAddressId: 'addr-1' },
  });

  assert.equal(createCalled, true);
  assert.deepEqual(result, { deliveryNo: 'DLV-20260610-0001' });
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

test('Deliveries: createForCompletedTransaction is idempotent for existing delivery', async () => {
  const prisma = {
    deliveryOrder: {
      findFirst: async () => ({ deliveryNo: 'DLV-20260609-0099' }),
    },
  };
  const service = makeService(prisma);
  const result = await service.createForCompletedTransaction(cashierUser(), {
    transactionId: 'trx-1',
    outletId: 'outlet-1',
    customerId: 'cust-1',
    delivery: { deliveryRequired: true, deliveryAddressId: 'addr-1' },
  });
  assert.deepEqual(result, { deliveryNo: 'DLV-20260609-0099' });
});

test('Deliveries: create rejects ONLINE_ORDER type via POST', async () => {
  const prisma = {
    customer: { findFirst: async () => ({ id: 'cust-1' }) },
  };
  const service = makeService(prisma);
  await assert.rejects(
    () =>
      service.create(cashierUser(), {
        customerId: 'cust-1',
        deliveryType: 'ONLINE_ORDER',
        addressSnapshot: { label: 'Rumah', addressLine1: 'Jl. A', city: 'Jakarta' },
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Deliveries: queueSummary applies WIB date filter', async () => {
  const prisma = {
    deliveryOrder: {
      groupBy: async ({
        where,
      }: {
        where: { createdAt?: { gte?: Date; lt?: Date } };
      }) => {
        assert.ok(where.createdAt?.gte);
        assert.ok(where.createdAt?.lt);
        return [{ status: 'MENUNGGU', _count: { _all: 3 } }];
      },
    },
  };
  const service = makeService(prisma);
  const summary = await service.queueSummary(managerUser(), {
    dateFrom: '2026-06-09',
    dateTo: '2026-06-09',
  });
  assert.equal(summary.MENUNGGU, 3);
});

test('Deliveries: createForCompletedTransaction skips when delivery not required', async () => {
  const prisma = {
    deliveryOrder: {
      findFirst: async () => {
        throw new Error('should not query');
      },
    },
  };
  const service = makeService(prisma);
  const result = await service.createForCompletedTransaction(cashierUser(), {
    transactionId: 'trx-1',
    outletId: 'outlet-1',
    customerId: 'cust-1',
    delivery: { deliveryRequired: false },
  });
  assert.equal(result, null);
});
