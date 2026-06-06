import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';
import { ONLINE_DELIVERY_FLAT_FEE } from '@barokah/shared';
import { StorefrontService } from './storefront.service';

const TENANT = { id: 'tenant-1', name: 'Barokah', slug: 'barokah-bangunan' };
const OUTLET = { id: 'outlet-1', tenantId: 'tenant-1', isActive: true, name: 'Cabang Pusat', address: 'Jl. Raya' };
const PRODUCT = {
  id: 'prod-1',
  name: 'Semen 40kg',
  sku: 'SMN-40',
  price: new Decimal(65000),
  moq: new Decimal(1),
  orderStep: new Decimal(1),
  unit: { symbol: 'sak' },
};

function buildPrisma(overrides: Record<string, unknown> = {}) {
  const createdOrders: Array<Record<string, unknown>> = [];
  return {
    createdOrders,
    tenant: {
      findFirst: async () => TENANT,
    },
    tenantSettings: {
      findUnique: async () => null,
    },
    onlineOrder: {
      findUnique: async () => null,
    },
    outlet: {
      findFirst: async () => OUTLET,
    },
    product: {
      findMany: async () => [PRODUCT],
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-1', quantity: new Decimal(10) }],
    },
    onlineOrderSequence: {
      upsert: async () => ({ lastValue: 1 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        onlineOrderSequence: {
          upsert: async () => ({ lastValue: 1 }),
        },
        onlineOrder: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            createdOrders.push(data);
            return {
              id: 'order-1',
              orderNo: 'WEB-20260606-0001',
              status: 'PENDING_PAYMENT',
              fulfillmentType: data.fulfillmentType,
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              subtotal: data.subtotal,
              tax: data.tax,
              shippingFee: data.shippingFee,
              total: data.total,
              deliveryAddress: data.deliveryAddress,
              expiresAt: data.expiresAt,
              midtransOrderId: data.midtransOrderId,
              outlet: OUTLET,
              items: [],
              payments: [],
            };
          },
        },
      };
      return fn(tx);
    },
    ...overrides,
  };
}

function buildMidtrans() {
  return {
    isMockMode: () => true,
    createSnapPayment: async () => ({
      snapToken: 'snap-token',
      redirectUrl: 'https://app.midtrans.com/snap/v2/vtweb/test',
    }),
  } as never;
}

function buildOnlineOrders() {
  return {
    handleMidtransWebhook: async () => ({ ok: true, message: 'Paid' }),
  } as never;
}

function buildCustomers() {
  return {
    findOrCreateByPhone: async (_tenantId: string, name: string, phone: string) => ({
      id: 'cust-1',
      tenantId: 'tenant-1',
      name,
      phone,
      points: 0,
    }),
  } as never;
}

function buildService(prisma: ReturnType<typeof buildPrisma>) {
  return new StorefrontService(prisma as never, buildMidtrans(), buildOnlineOrders(), buildCustomers());
}

test('Storefront: createOrder DELIVERY applies flat shipping fee', async () => {
  const prisma = buildPrisma();
  const service = buildService(prisma);

  const result = await service.createOrder('barokah-bangunan', {
    clientRequestId: 'req-delivery-1',
    outletId: 'outlet-1',
    fulfillmentType: 'DELIVERY',
    customer: { name: 'Budi Proyek', phone: '081234567890' },
    items: [{ productId: 'prod-1', quantity: 2 }],
    deliveryAddress: {
      street: 'Jl. Merdeka No. 10',
      district: 'Coblong',
      city: 'Bandung',
      postalCode: '40123',
    },
  });

  assert.equal(result.order.fulfillmentType, 'DELIVERY');
  assert.equal(result.order.subtotal, 130000);
  assert.equal(result.order.tax, 14300);
  assert.equal(result.order.shippingFee, ONLINE_DELIVERY_FLAT_FEE);
  assert.equal(result.order.total, 130000 + 14300 + ONLINE_DELIVERY_FLAT_FEE);
  assert.equal(Number(prisma.createdOrders[0]?.shippingFee), ONLINE_DELIVERY_FLAT_FEE);
  assert.deepEqual(prisma.createdOrders[0]?.deliveryAddress, {
    street: 'Jl. Merdeka No. 10',
    district: 'Coblong',
    city: 'Bandung',
    postalCode: '40123',
  });
});

test('Storefront: createOrder PICKUP has zero shipping fee', async () => {
  const prisma = buildPrisma();
  const service = buildService(prisma);

  const result = await service.createOrder('barokah-bangunan', {
    clientRequestId: 'req-pickup-1',
    outletId: 'outlet-1',
    fulfillmentType: 'PICKUP',
    customer: { name: 'Ani', phone: '081298765432' },
    items: [{ productId: 'prod-1', quantity: 1 }],
  });

  assert.equal(result.order.fulfillmentType, 'PICKUP');
  assert.equal(result.order.shippingFee, 0);
  assert.equal(result.order.total, 65000 + 7150);
  assert.equal(prisma.createdOrders[0]?.deliveryAddress, undefined);
});

test('Storefront: createOrder rejects honeypot website field', async () => {
  const prisma = buildPrisma();
  const service = buildService(prisma);

  await assert.rejects(
    () =>
      service.createOrder('barokah-bangunan', {
        clientRequestId: 'req-bot-1',
        outletId: 'outlet-1',
        fulfillmentType: 'PICKUP',
        customer: { name: 'Bot', phone: '081234567890' },
        items: [{ productId: 'prod-1', quantity: 1 }],
        website: 'http://spam.example',
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    },
  );
});
