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

function buildStorefrontCustomerAuth() {
  return {
    resolveCustomerAddress: async () => ({
      id: 'addr-1',
      addressLine1: 'Jl. Test 1',
      addressLine2: 'Catatan',
      province: 'Menteng',
      city: 'Jakarta Pusat',
      postalCode: '10110',
    }),
  } as never;
}

function buildService(prisma: ReturnType<typeof buildPrisma>) {
  return new StorefrontService(
    prisma as never,
    buildMidtrans(),
    buildOnlineOrders(),
    buildCustomers(),
    buildStorefrontCustomerAuth(),
  );
}

const MOCK_CUSTOMER_JWT = {
  sub: 'cust-1',
  tenantId: 'tenant-1',
  tenantSlug: 'barokah-bangunan',
  phone: '081234567890',
  kind: 'storefront_customer' as const,
};

test('Storefront: createOrder DELIVERY applies flat shipping fee', async () => {
  const prisma = buildPrisma({
    customer: {
      findFirst: async () => ({ id: 'cust-1', name: 'Budi Proyek', phone: '081234567890' }),
    },
  });
  const service = buildService(prisma);

  const result = await service.createOrder(
    'barokah-bangunan',
    {
      clientRequestId: 'req-delivery-1',
      outletId: 'outlet-1',
      fulfillmentType: 'DELIVERY',
      customer: { name: 'Budi Proyek', phone: '081234567890' },
      items: [{ productId: 'prod-1', quantity: 2 }],
      customerAddressId: 'addr-1',
    },
    MOCK_CUSTOMER_JWT,
  );

  assert.equal(result.order.fulfillmentType, 'DELIVERY');
  assert.equal(result.order.subtotal, 130000);
  assert.equal(result.order.tax, 14300);
  assert.equal(result.order.shippingFee, ONLINE_DELIVERY_FLAT_FEE);
  assert.equal(result.order.total, 130000 + 14300 + ONLINE_DELIVERY_FLAT_FEE);
  assert.equal(Number(prisma.createdOrders[0]?.shippingFee), ONLINE_DELIVERY_FLAT_FEE);
  assert.deepEqual(prisma.createdOrders[0]?.deliveryAddress, {
    street: 'Jl. Test 1',
    district: 'Menteng',
    city: 'Jakarta Pusat',
    postalCode: '10110',
  });
});

test('Storefront: createOrder PICKUP has zero shipping fee', async () => {
  const prisma = buildPrisma({
    customer: {
      findFirst: async () => ({ id: 'cust-1', name: 'Ani', phone: '081298765432' }),
    },
  });
  const service = buildService(prisma);

  const result = await service.createOrder(
    'barokah-bangunan',
    {
      clientRequestId: 'req-pickup-1',
      outletId: 'outlet-1',
      fulfillmentType: 'PICKUP',
      customer: { name: 'Ani', phone: '081298765432' },
      items: [{ productId: 'prod-1', quantity: 1 }],
    },
    MOCK_CUSTOMER_JWT,
  );

  assert.equal(result.order.fulfillmentType, 'PICKUP');
  assert.equal(result.order.shippingFee, 0);
  assert.equal(result.order.total, 65000 + 7150);
  assert.equal(prisma.createdOrders[0]?.deliveryAddress, undefined);
});

test('Storefront: getConfig returns tenant and merged settings', async () => {
  const prisma = buildPrisma({
    tenant: {
      findFirst: async () => ({
        id: 'tenant-1',
        name: 'Barokah Toko Bangunan',
        slug: 'barokah-bangunan',
        description: 'Material bangunan',
        contactPhone: '021-5551234',
        whatsapp: '081234567890',
        logoUrl: null,
      }),
    },
    category: {
      findMany: async () => [{ id: 'cat-1', name: 'Semen & Mortar' }],
    },
  });
  const service = buildService(prisma);
  const config = await service.getConfig('barokah-bangunan');
  assert.equal(config.tenant.slug, 'barokah-bangunan');
  assert.equal(config.settings.enabled, true);
  assert.equal(config.featuredCategories[0]?.name, 'Semen & Mortar');
  assert.equal(config.storefrontUrl, '/store/barokah-bangunan');
});

test('Storefront: listProducts only queries sellOnline parents and simple products', async () => {
  let listWhere: Record<string, unknown> | undefined;
  const prisma = buildPrisma({
    product: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        listWhere = args.where;
        return [];
      },
      count: async () => 0,
    },
    inventoryItem: {
      findMany: async () => [],
    },
  });
  const service = buildService(prisma);

  const result = await service.listProducts('barokah-bangunan', {
    outletId: 'outlet-1',
    page: 1,
    limit: 20,
  });

  assert.equal(result.items.length, 0);
  assert.equal(listWhere?.sellOnline, true);
});

test('Storefront: listProducts includes variant summary when parent sellOnline is true', async () => {
  const VARIANT_PARENT = {
    id: 'prod-parent',
    name: 'Cat Tembok',
    sku: 'CAT-001',
    price: new Decimal(0),
    moq: new Decimal(1),
    orderStep: new Decimal(1),
    imageUrl: null,
    webPlaceholderKey: 'generic-building',
    hasVariants: true,
    unit: { symbol: 'klg' },
    variants: [
      { id: 'variant-putih', name: 'Cat Tembok Putih', variantLabel: 'Putih', price: new Decimal(85000) },
      { id: 'variant-merah', name: 'Cat Tembok Merah', variantLabel: 'Merah', price: new Decimal(90000) },
    ],
  };
  const prisma = buildPrisma({
    product: {
      findMany: async () => [VARIANT_PARENT],
      count: async () => 1,
    },
    inventoryItem: {
      findMany: async () => [
        { productId: 'variant-putih', quantity: new Decimal(5) },
        { productId: 'variant-merah', quantity: new Decimal(3) },
      ],
    },
  });
  const service = buildService(prisma);

  const result = await service.listProducts('barokah-bangunan', {
    outletId: 'outlet-1',
    page: 1,
    limit: 20,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.hasVariants, true);
  assert.equal(result.items[0]?.fromPrice, 85000);
  assert.equal(result.items[0]?.stockStatus, 'AVAILABLE');
  assert.deepEqual(result.items[0]?.variantSummary, [
    { id: 'variant-putih', name: 'Putih', price: 85000, stock: 5 },
    { id: 'variant-merah', name: 'Merah', price: 90000, stock: 3 },
  ]);
});

test('Storefront: getProduct returns variants with prices for parent product', async () => {
  const VARIANT_PARENT = {
    id: 'prod-parent',
    name: 'Cat Tembok',
    sku: 'CAT-001',
    price: new Decimal(0),
    moq: new Decimal(1),
    orderStep: new Decimal(1),
    imageUrl: null,
    webPlaceholderKey: 'generic-building',
    hasVariants: true,
    categoryId: 'cat-1',
    unit: { symbol: 'klg' },
    variants: [
      {
        id: 'variant-putih',
        name: 'Cat Tembok Putih',
        sku: 'CAT-001-P',
        variantLabel: 'Putih',
        price: new Decimal(85000),
        moq: new Decimal(1),
        orderStep: new Decimal(1),
      },
      {
        id: 'variant-merah',
        name: 'Cat Tembok Merah',
        sku: 'CAT-001-M',
        variantLabel: 'Merah',
        price: new Decimal(90000),
        moq: new Decimal(1),
        orderStep: new Decimal(1),
      },
    ],
  };
  let lookupCount = 0;
  const prisma = buildPrisma({
    product: {
      findFirst: async (args: { where: { id?: string; sellOnline?: boolean } }) => {
        lookupCount += 1;
        if (lookupCount === 1) {
          return {
            id: 'prod-parent',
            parentProductId: null,
            sellOnline: true,
            parentProduct: null,
          };
        }
        if (args.where.sellOnline === true) return VARIANT_PARENT;
        return null;
      },
      findMany: async () => [],
    },
    inventoryItem: {
      findMany: async () => [
        { productId: 'variant-putih', quantity: new Decimal(4) },
        { productId: 'variant-merah', quantity: new Decimal(0) },
      ],
    },
  });
  const service = buildService(prisma);

  const result = await service.getProduct('barokah-bangunan', 'prod-parent', 'outlet-1');

  assert.equal(result.hasVariants, true);
  assert.equal(result.variants?.length, 2);
  assert.equal(result.variants?.[0]?.price, 85000);
  assert.equal(result.variants?.[1]?.price, 90000);
  const firstVariant = result.variants?.[0] as { stockStatus?: string } | undefined;
  const secondVariant = result.variants?.[1] as { stockStatus?: string } | undefined;
  assert.equal(firstVariant?.stockStatus, 'AVAILABLE');
  assert.equal(secondVariant?.stockStatus, 'OUT_OF_STOCK');
});

test('Storefront: createOrder authenticated customer stores normalized 628 phone and returns 08 display', async () => {
  const prisma = buildPrisma({
    customer: {
      findFirst: async () => ({ id: 'cust-1', name: 'Budi', phone: '6281234567890' }),
    },
  });
  const service = buildService(prisma);

  const result = await service.createOrder(
    'barokah-bangunan',
    {
      clientRequestId: 'req-auth-phone-1',
      outletId: 'outlet-1',
      fulfillmentType: 'PICKUP',
      customer: { name: 'Budi', phone: '081234567890' },
      items: [{ productId: 'prod-1', quantity: 1 }],
    },
    MOCK_CUSTOMER_JWT,
  );

  assert.equal(prisma.createdOrders[0]?.customerPhone, '6281234567890');
  assert.equal(result.order.customer.phone, '081234567890');
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
