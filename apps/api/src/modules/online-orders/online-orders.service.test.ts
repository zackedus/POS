import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { ErrorCodes } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { OnlineOrdersService } from './online-orders.service';
import { MidtransService } from './midtrans.service';

function cashierUser(): AuthJwtPayload {
  return {
    sub: 'cashier-1',
    email: 'kasir@barokah.test',
    tenantId: 'tenant-1',
    role: 'CASHIER',
    outletIds: ['outlet-1'],
  };
}

function noopRealtime() {
  return {
    emitOnlineOrderPaid: () => undefined,
    emitOnlineOrderUpdated: () => undefined,
    emitStockChanged: () => undefined,
  };
}

test('OnlineOrders: updateStatus rejects invalid transition', async () => {
  const prisma = {
    onlineOrder: {
      findFirst: async () => ({
        id: 'order-1',
        status: 'PAID',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
      }),
      update: async () => {
        throw new Error('update should not be called');
      },
    },
  };

  const service = new OnlineOrdersService(prisma as never, {} as MidtransService, noopRealtime() as never);
  await assert.rejects(
    () =>
      service.updateStatus(cashierUser(), 'order-1', { status: 'COMPLETED' as never }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('OnlineOrders: webhook ignores already paid order', async () => {
  const prisma = {
    onlineOrder: {
      findFirst: async () => ({
        id: 'order-1',
        status: 'PAID',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        orderNo: 'WEB-20260605-0001',
        items: [],
        payments: [],
      }),
    },
    tenantSettings: {
      findUnique: async () => null,
    },
    onlineOrderPayment: {
      findFirst: async () => null,
    },
  };

  const midtrans = {
    verifySignature: () => true,
    isPaidNotification: () => true,
    isCancelledNotification: () => false,
  };

  const service = new OnlineOrdersService(prisma as never, midtrans as never, noopRealtime() as never);
  const result = await service.handleMidtransWebhook({
    order_id: 'WEB-20260605-0001',
    transaction_status: 'settlement',
    status_code: '200',
    gross_amount: '100000.00',
    transaction_id: 'mt-1',
  });
  assert.equal(result.message, 'Already paid');
});

test('OnlineOrders: listManagerOrders paginates with date filter', async () => {
  const prisma = {
    onlineOrder: {
      findMany: async () => [
        {
          id: 'order-1',
          orderNo: 'WEB-20260606-0001',
          status: 'PAID',
          createdAt: new Date('2026-06-06T10:00:00.000Z'),
          customerName: 'Budi',
          customerPhone: '081234567890',
          fulfillmentType: 'PICKUP',
          deliveryAddress: null,
          shippingFee: 0,
          total: 100000,
          customerNotes: null,
          items: [{ id: 'item-1' }],
        },
      ],
      count: async () => 1,
      updateMany: async () => ({ count: 0 }),
    },
  };

  const service = new OnlineOrdersService(prisma as never, {} as MidtransService, noopRealtime() as never);
  const result = await service.listManagerOrders(
    {
      sub: 'mgr-1',
      email: 'mgr@test',
      tenantId: 'tenant-1',
      role: 'MANAGER',
      outletIds: ['outlet-1'],
    },
    { outletId: 'outlet-1', page: 1, limit: 20, dateFrom: '2026-06-06T00:00:00.000Z' },
  );

  assert.equal(result.items.length, 1);
  assert.equal(result.meta.total, 1);
  assert.equal(result.items[0]?.orderNo, 'WEB-20260606-0001');
});

test('Edge BL-EC-05: markOrderPaid rejects when stock race depletes inventory (409 INSUFFICIENT_STOCK)', async () => {
  const prisma = {
    onlineOrder: {
      findFirst: async () => ({
        id: 'order-race',
        status: 'PENDING_PAYMENT',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        orderNo: 'WEB-20260606-0099',
        midtransOrderId: 'WEB-20260606-0099',
        items: [{ productId: 'prod-1', quantity: 5 }],
        payments: [],
      }),
      findUnique: async () => ({
        id: 'order-race',
        status: 'PENDING_PAYMENT',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        orderNo: 'WEB-20260606-0099',
        total: 100000,
        items: [{ productId: 'prod-1', quantity: 5 }],
      }),
    },
    tenantSettings: {
      findUnique: async () => null,
    },
    onlineOrderPayment: {
      findFirst: async () => null,
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: 2 }],
    },
    user: {
      findFirst: async () => ({ id: 'system-1' }),
    },
    $transaction: async () => {
      throw new Error('$transaction should not run when stock insufficient');
    },
  };

  const midtrans = {
    verifySignature: () => true,
    isPaidNotification: () => true,
    isCancelledNotification: () => false,
  };

  const service = new OnlineOrdersService(prisma as never, midtrans as never, noopRealtime() as never);
  await assert.rejects(
    () =>
      service.handleMidtransWebhook({
        order_id: 'WEB-20260606-0099',
        transaction_status: 'settlement',
        status_code: '200',
        gross_amount: '100000.00',
        transaction_id: 'mt-race-1',
      }),
    (error: unknown) => {
      assert.ok(error instanceof ConflictException);
      const response = error.getResponse() as { code?: string };
      assert.equal(response.code, ErrorCodes.INSUFFICIENT_STOCK);
      return true;
    },
  );
});
