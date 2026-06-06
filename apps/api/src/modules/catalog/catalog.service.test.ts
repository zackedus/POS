import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CatalogService } from './catalog.service';

function createUser(): AuthJwtPayload {
  return {
    sub: 'manager-1',
    email: 'manager@barokah.test',
    tenantId: 'tenant-1',
    role: 'MANAGER',
    outletIds: ['outlet-1'],
  };
}

test('Catalog: createProduct rejects hasVariants with parentProductId', async () => {
  const prisma = {
    unit: { findFirst: async () => ({ id: 'unit-1' }) },
    category: { findFirst: async () => null },
    product: {
      findFirst: async () => ({ id: 'prod-parent', tenantId: 'tenant-1', isActive: true }),
      create: async () => {
        throw new Error('create should not be called');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.createProduct(createUser(), {
        sku: 'SKU-001',
        name: 'Cat Tembok 5L',
        price: 120000,
        unitId: 'unit-1',
        hasVariants: true,
        parentProductId: 'prod-parent',
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Catalog: listProductsGrid excludes parent variant products', async () => {
  const prisma = {
    product: {
      findMany: async (args: { where: { hasVariants?: boolean }; select?: unknown }) => {
        assert.equal(args.where.hasVariants, false);
        assert.ok(args.select);
        return [
          {
            id: 'prod-child',
            sku: 'CAT-5L',
            name: 'Cat Tembok Interior — 5 Liter',
            price: 145000,
            imageUrl: null,
            variantLabel: '5 Liter',
            moq: { toString: () => '1' },
            orderStep: { toString: () => '1' },
            unit: { id: 'unit-1', name: 'Liter', symbol: 'liter' },
            category: { id: 'cat-1', name: 'Cat' },
            unitConversions: [],
            bundleDefinition: null,
          },
        ];
      },
      count: async () => {
        throw new Error('count should not be called without withMeta');
      },
    },
    inventoryItem: {
      findMany: async () => [],
    },
  };

  const service = new CatalogService(prisma as never);
  const grid = await service.listProductsGrid(createUser(), {});
  assert.ok(Array.isArray(grid));
  assert.equal(grid.length, 1);
  assert.equal(grid[0]?.variantLabel, '5 Liter');
  assert.equal('barcode' in (grid[0] as object) ? (grid[0] as { barcode?: string }).barcode : undefined, undefined);
});

test('Catalog: listProductsGrid withMeta returns total and slim bundle flag', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: 'prod-bundle',
          sku: 'BND-001',
          name: 'Paket Renovasi',
          price: 300000,
          imageUrl: null,
          variantLabel: null,
          moq: { toString: () => '1' },
          orderStep: { toString: () => '1' },
          unit: { id: 'unit-1', name: 'Paket', symbol: 'pkt' },
          category: null,
          unitConversions: [],
          bundleDefinition: { isActive: true, _count: { items: 2 } },
        },
      ],
      count: async () => 1,
    },
    inventoryItem: {
      findMany: async () => [{ productId: 'prod-bundle', quantity: 5 }],
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.listProductsGrid(createUser(), { withMeta: true });
  assert.ok(!Array.isArray(result));
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]?.isBundle, true);
  assert.equal('bundleItems' in (result.items[0] as object) ? (result.items[0] as { bundleItems?: unknown }).bundleItems : undefined, undefined);
  assert.equal(result.items[0]?.stockQty, 5);
});

test('Catalog: listProducts paginates when page query is provided', async () => {
  let findArgs: { skip?: number; take?: number } | undefined;
  const prisma = {
    product: {
      findMany: async (args: { skip?: number; take?: number }) => {
        findArgs = args;
        return [
          {
            id: 'prod-1',
            sku: 'SMN-001',
            barcode: null,
            name: 'Semen',
            price: { toString: () => '75000' },
            costPrice: { toString: () => '70000' },
            unitId: 'unit-1',
            categoryId: null,
            parentProductId: null,
            variantLabel: null,
            hasVariants: false,
            isActive: true,
            sellOnline: false,
            imageUrl: null,
            moq: { toString: () => '1' },
            orderStep: { toString: () => '1' },
            unit: null,
            category: null,
            parentProduct: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { variants: 0 },
            unitConversions: [],
            bundleDefinition: null,
          },
        ];
      },
      count: async () => 120,
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.listProducts(createUser(), { page: 2, limit: 50 });
  assert.ok(findArgs);
  assert.equal(findArgs.skip, 50);
  assert.equal(findArgs.take, 50);
  assert.ok(!Array.isArray(result));
  assert.equal(result.meta.page, 2);
  assert.equal(result.meta.total, 120);
  assert.equal(result.meta.totalPages, 3);
  assert.equal(result.items.length, 1);
});

test('Catalog: createProduct rejects variantLabel without parentProductId', async () => {
  const prisma = {
    unit: { findFirst: async () => ({ id: 'unit-1' }) },
    category: { findFirst: async () => null },
    product: {
      findFirst: async () => null,
      create: async () => {
        throw new Error('create should not be called');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.createProduct(createUser(), {
        sku: 'SKU-003',
        name: 'Cat Tembok 5L',
        price: 120000,
        unitId: 'unit-1',
        variantLabel: '5 Liter',
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Catalog: createProduct rejects unknown parent product', async () => {
  const prisma = {
    unit: { findFirst: async () => ({ id: 'unit-1' }) },
    category: { findFirst: async () => null },
    product: {
      findFirst: async () => null,
      create: async () => {
        throw new Error('create should not be called');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.createProduct(createUser(), {
        sku: 'SKU-002',
        name: 'Cat Tembok 10L',
        price: 180000,
        unitId: 'unit-1',
        parentProductId: 'prod-parent',
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});

test('Catalog: createProductBundle rejects parent variant product as bundle header', async () => {
  const prisma = {
    product: {
      findFirst: async () => ({ id: 'prod-parent', hasVariants: true }),
      findMany: async () => [],
    },
    productBundle: {
      upsert: async () => {
        throw new Error('productBundle.upsert should not be called');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.createProductBundle(createUser(), {
        bundleProductId: 'prod-parent',
        items: [{ componentProductId: 'prod-child', quantity: 1 }],
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Catalog: createProductUnitConversion allows base sell unit with factor 1', async () => {
  let upsertPayload: Record<string, unknown> | null = null;
  const prisma = {
    product: {
      findFirst: async () => ({ id: 'prod-1', unitId: 'unit-base' }),
    },
    unit: {
      findFirst: async () => ({ id: 'unit-base' }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        productUnitConversion: {
          updateMany: async () => ({ count: 0 }),
          upsert: async (args: { create: Record<string, unknown> }) => {
            upsertPayload = args.create;
            return args.create;
          },
        },
      }),
  };

  const service = new CatalogService(prisma as never);
  await service.createProductUnitConversion(createUser(), {
    productId: 'prod-1',
    sellUnitId: 'unit-base',
    conversionToBase: 1,
    isSellUnit: true,
    isPurchaseUnit: false,
    sellStep: 0.5,
    minQty: 0.5,
  });
  assert.equal(upsertPayload!.conversionToBase, 1);
  assert.equal(upsertPayload!.isSellUnit, true);
});

test('Catalog: createProductUnitConversion rejects purchase unit same as base', async () => {
  const prisma = {
    product: {
      findFirst: async () => ({ id: 'prod-1', unitId: 'unit-base' }),
    },
    unit: {
      findFirst: async () => ({ id: 'unit-base' }),
    },
    $transaction: async () => {
      throw new Error('$transaction should not be called');
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.createProductUnitConversion(createUser(), {
        productId: 'prod-1',
        sellUnitId: 'unit-base',
        conversionToBase: 1,
        isPurchaseUnit: true,
        isSellUnit: false,
      }),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Catalog: upsertProductBundleOutletPolicy requires existing outlet in tenant', async () => {
  const prisma = {
    outlet: {
      findFirst: async () => null,
    },
    productBundle: {
      findFirst: async () => ({ id: 'bundle-1' }),
    },
    productBundleOutletPolicy: {
      upsert: async () => {
        throw new Error('upsert should not run when outlet is missing');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () =>
      service.upsertProductBundleOutletPolicy(createUser(), {
        bundleProductId: '277d8249-aafb-4a90-b797-7150678f31cb',
        outletId: 'outlet-1',
        isActive: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof NotFoundException);
      return true;
    },
  );
});

test('Catalog: createUnit creates tenant-scoped unit', async () => {
  let created = false;
  const prisma = {
    unit: {
      create: async (args: { data: { tenantId: string; name: string; symbol: string } }) => {
        created = true;
        assert.equal(args.data.tenantId, 'tenant-1');
        assert.equal(args.data.name, 'Dus');
        assert.equal(args.data.symbol, 'dus');
        return { id: 'unit-dus', ...args.data, createdAt: new Date() };
      },
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.createUnit(createUser(), { name: 'Dus', symbol: 'dus' });
  assert.ok(created);
  assert.equal(result.symbol, 'dus');
});

test('Catalog: listUnits returns usage counts per tenant unit', async () => {
  const prisma = {
    unit: {
      findMany: async () => [
        {
          id: 'unit-kg',
          tenantId: 'tenant-1',
          name: 'Kilogram',
          symbol: 'kg',
          createdAt: new Date(),
          _count: { products: 2, sellUnitConversions: 1 },
        },
      ],
    },
  };

  const service = new CatalogService(prisma as never);
  const rows = await service.listUnits(createUser());
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.usage.baseProductCount, 2);
  assert.equal(rows[0]!.usage.conversionEntryCount, 1);
});

test('Catalog: listProductVariants requires parent with hasVariants', async () => {
  const prisma = {
    product: {
      findFirst: async () => ({ id: 'prod-1', hasVariants: false, unitId: 'unit-1', categoryId: null, name: 'Semen' }),
      findMany: async () => {
        throw new Error('findMany should not run');
      },
    },
  };

  const service = new CatalogService(prisma as never);
  await assert.rejects(
    () => service.listProductVariants(createUser(), 'prod-1'),
    (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      return true;
    },
  );
});

test('Catalog: createProductVariant inherits unit from parent', async () => {
  let createPayload: Record<string, unknown> | null = null;
  const prisma = {
    product: {
      findFirst: async () => ({
        id: 'prod-parent',
        hasVariants: true,
        unitId: 'unit-liter',
        categoryId: 'cat-1',
        name: 'Cat Tembok',
      }),
      create: async (args: { data: Record<string, unknown> }) => {
        createPayload = args.data;
        return {
          ...args.data,
          id: 'variant-1',
          barcode: null,
          costPrice: { toString: () => '0' },
          price: { toString: () => '145000' },
          isActive: true,
          parentProductId: 'prod-parent',
          variantLabel: '5 Liter',
          unit: { id: 'unit-liter', name: 'Liter', symbol: 'liter' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.createProductVariant(createUser(), 'prod-parent', {
    sku: 'CAT-5L',
    name: 'Cat Tembok — 5 Liter',
    variantLabel: '5 Liter',
    price: 145000,
  });

  assert.equal(createPayload!.unitId, 'unit-liter');
  assert.equal(createPayload!.parentProductId, 'prod-parent');
  assert.equal(createPayload!.hasVariants, false);
  assert.equal(result.sku, 'CAT-5L');
});

test('Catalog: listProducts hides costPrice from cashier even with includeCost query', async () => {
  const prisma = {
    product: {
      findMany: async () => [
        {
          id: 'prod-1',
          sku: 'SMN-001',
          barcode: null,
          name: 'Semen',
          price: { toString: () => '75000' },
          costPrice: { toString: () => '70000' },
          unitId: 'unit-1',
          categoryId: null,
          parentProductId: null,
          variantLabel: null,
          hasVariants: false,
          isActive: true,
          sellOnline: false,
          imageUrl: null,
          moq: { toString: () => '1' },
          orderStep: { toString: () => '1' },
          unit: null,
          category: null,
          parentProduct: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { variants: 0 },
          unitConversions: [],
          bundleDefinition: null,
        },
      ],
    },
  };
  const service = new CatalogService(prisma as never);
  const cashierUser: AuthJwtPayload = { ...createUser(), role: 'CASHIER', sub: 'cashier-1' };
  const rows = await service.listProducts(cashierUser, { includeCost: true });
  assert.ok(Array.isArray(rows));
  assert.equal(rows[0]?.costPrice, undefined);
});

test('Catalog: updateProductBundle replaces items and toggles isActive', async () => {
  let updatePayload: Record<string, unknown> | null = null;
  const prisma = {
    productBundle: {
      findFirst: async () => ({ id: 'bundle-1', bundleProductId: 'prod-bundle' }),
      update: async (args: { data: Record<string, unknown> }) => {
        updatePayload = args.data;
        return { id: 'bundle-1' };
      },
      findMany: async () => [
        {
          id: 'bundle-1',
          bundleProductId: 'prod-bundle',
          isActive: false,
          notes: 'Updated',
          bundleProduct: { id: 'prod-bundle', sku: 'BND-1', name: 'Paket A', price: 100000, costPrice: 0 },
          items: [
            {
              id: 'item-1',
              componentProductId: 'prod-child',
              quantity: 2,
              componentProduct: { id: 'prod-child', sku: 'CH-1', name: 'Child', price: 10000, costPrice: 5000 },
            },
          ],
          outletPolicies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    },
    product: {
      findMany: async () => [{ id: 'prod-child', hasVariants: false }],
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.updateProductBundle(createUser(), 'prod-bundle', {
    isActive: false,
    notes: 'Updated',
    items: [{ componentProductId: 'prod-child', quantity: 2 }],
  });

  assert.ok(updatePayload);
  assert.equal(result?.isActive, false);
});

test('Catalog: deleteProductBundle removes bundle by product id', async () => {
  let deletedId: string | null = null;
  const prisma = {
    productBundle: {
      findFirst: async () => ({ id: 'bundle-1' }),
      delete: async (args: { where: { id: string } }) => {
        deletedId = args.where.id;
      },
    },
  };

  const service = new CatalogService(prisma as never);
  const result = await service.deleteProductBundle(createUser(), 'prod-bundle');
  assert.equal(deletedId, 'bundle-1');
  assert.equal(result.deleted, true);
});
