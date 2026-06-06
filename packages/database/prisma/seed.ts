/**
 * Dev seed — Barokah Core POS
 *
 * Default passwords (dev only):
 * - owner@barokah.local   → Owner123!
 * - manager@barokah.local → Manager123!
 * - kasir@barokah.local   → Kasir123!
 */
import { PrismaClient, UserRole, ExpenseCategory } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_PASSWORDS: Record<string, string> = {
  'owner@barokah.local': 'Owner123!',
  'manager@barokah.local': 'Manager123!',
  'kasir@barokah.local': 'Kasir123!',
};

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'barokah-bangunan' },
    update: { name: 'Barokah Toko Bangunan' },
    create: {
      name: 'Barokah Toko Bangunan',
      slug: 'barokah-bangunan',
    },
  });

  const outletMain = await prisma.outlet.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'MAIN' },
    },
    update: { name: 'Cabang Utama' },
    create: {
      tenantId: tenant.id,
      name: 'Cabang Utama',
      code: 'MAIN',
      address: 'Jl. Contoh No. 1',
    },
  });

  const outletNorth = await prisma.outlet.upsert({
    where: {
      tenantId_code: { tenantId: tenant.id, code: 'NORTH' },
    },
    update: { name: 'Cabang Utara' },
    create: {
      tenantId: tenant.id,
      name: 'Cabang Utara',
      code: 'NORTH',
      address: 'Jl. Utara No. 12',
    },
  });

  const users: Array<{
    email: string;
    fullName: string;
    role: UserRole;
  }> = [
    { email: 'owner@barokah.local', fullName: 'Owner Demo', role: UserRole.OWNER },
    { email: 'manager@barokah.local', fullName: 'Manager Demo', role: UserRole.MANAGER },
    { email: 'kasir@barokah.local', fullName: 'Kasir Demo', role: UserRole.CASHIER },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(DEV_PASSWORDS[u.email], 10);
    const user = await prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: u.email },
      },
      update: {
        fullName: u.fullName,
        role: u.role,
        passwordHash,
        isActive: true,
      },
      create: {
        tenantId: tenant.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        passwordHash,
      },
    });

    const outletIds =
      u.role === UserRole.OWNER
        ? [outletMain.id, outletNorth.id]
        : u.role === UserRole.MANAGER
          ? [outletMain.id]
          : [outletMain.id];

    for (const outletId of outletIds) {
      await prisma.userOutlet.upsert({
        where: {
          userId_outletId: { userId: user.id, outletId },
        },
        update: {},
        create: {
          userId: user.id,
          outletId,
        },
      });
    }
  }

  const units = [
    { name: 'Sak', symbol: 'sak' },
    { name: 'Batang', symbol: 'batang' },
    { name: 'Meter Persegi', symbol: 'm²' },
    { name: 'Meter', symbol: 'm' },
    { name: 'Roll', symbol: 'roll' },
    { name: 'Kilogram', symbol: 'kg' },
    { name: 'Liter', symbol: 'liter' },
    { name: 'Dus', symbol: 'dus' },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { tenantId_symbol: { tenantId: tenant.id, symbol: unit.symbol } },
      update: { name: unit.name },
      create: {
        tenantId: tenant.id,
        name: unit.name,
        symbol: unit.symbol,
      },
    });
  }

  const categories = ['Semen', 'Cat', 'Pipa', 'Keramik', 'Besi & Baja', 'Atap & Seng', 'Saniter', 'Perkakas'];
  for (const categoryName of categories) {
    const existing = await prisma.category.findFirst({
      where: { tenantId: tenant.id, name: categoryName },
    });
    if (!existing) {
      await prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: categoryName,
        },
      });
    }
  }

  const unitBySymbol = Object.fromEntries((await prisma.unit.findMany({ where: { tenantId: tenant.id } })).map((u) => [u.symbol, u.id]));
  const categoryByName = Object.fromEntries(
    (await prisma.category.findMany({ where: { tenantId: tenant.id } })).map((c) => [c.name, c.id]),
  );

  const sampleProducts = [
    { sku: 'SMN-001', name: 'Semen Portland 40kg', price: 75000, costPrice: 70000, unitSymbol: 'sak', categoryName: 'Semen' },
    { sku: 'PPA-001', name: 'Pipa PVC 3 Meter', price: 62000, costPrice: 54000, unitSymbol: 'batang', categoryName: 'Pipa' },
    { sku: 'KRM-001', name: 'Keramik Lantai 40x40', price: 68000, costPrice: 59000, unitSymbol: 'm²', categoryName: 'Keramik' },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: product.sku } },
      update: {
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        unitId: unitBySymbol[product.unitSymbol],
        categoryId: categoryByName[product.categoryName],
      },
      create: {
        tenantId: tenant.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        costPrice: product.costPrice,
        unitId: unitBySymbol[product.unitSymbol],
        categoryId: categoryByName[product.categoryName],
      },
    });
  }

  // Varian produk — induk Cat Tembok + turunan ukuran (Sprint 5)
  const catParent = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'CAT-PARENT' } },
    update: {
      name: 'Cat Tembok Interior',
      hasVariants: true,
      variantLabel: null,
      parentProductId: null,
      price: 0,
      costPrice: 0,
      unitId: unitBySymbol.liter,
      categoryId: categoryByName.Cat,
    },
    create: {
      tenantId: tenant.id,
      sku: 'CAT-PARENT',
      name: 'Cat Tembok Interior',
      hasVariants: true,
      price: 0,
      costPrice: 0,
      unitId: unitBySymbol.liter,
      categoryId: categoryByName.Cat,
    },
  });

  const catVariants = [
    { sku: 'CAT-5L', label: '5 Liter', price: 85000, costPrice: 72000 },
    { sku: 'CAT-25L', label: '25 Liter', price: 350000, costPrice: 310000 },
  ];

  await prisma.product.deleteMany({
    where: {
      tenantId: tenant.id,
      parentProductId: catParent.id,
      sku: { notIn: catVariants.map((v) => v.sku) },
    },
  });

  for (const variant of catVariants) {
    await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: variant.sku } },
      update: {
        name: `Cat Tembok Interior — ${variant.label}`,
        variantLabel: variant.label,
        parentProductId: catParent.id,
        hasVariants: false,
        price: variant.price,
        costPrice: variant.costPrice,
        unitId: unitBySymbol.liter,
        categoryId: categoryByName.Cat,
      },
      create: {
        tenantId: tenant.id,
        sku: variant.sku,
        name: `Cat Tembok Interior — ${variant.label}`,
        variantLabel: variant.label,
        parentProductId: catParent.id,
        hasVariants: false,
        price: variant.price,
        costPrice: variant.costPrice,
        unitId: unitBySymbol.liter,
        categoryId: categoryByName.Cat,
      },
    });
  }

  // Sprint 6 baseline: multi-satuan conversion + bundling fixed
  const semenProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id, sku: 'SMN-001' },
    select: { id: true },
  });
  const pipaProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id, sku: 'PPA-001' },
    select: { id: true },
  });
  const cat5lProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id, sku: 'CAT-5L' },
    select: { id: true },
  });

  // Multi-unit example: Paku 2" — beli dus (20 kg), jual per kg (step 0.5) + per dus
  const besiCategoryId = categoryByName['Besi & Baja'];
  const pakuProduct = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'PKU-2IN' } },
    update: {
      name: 'Paku 2"',
      price: 18000,
      costPrice: 15000,
      unitId: unitBySymbol.kg,
      categoryId: besiCategoryId,
      moq: 0.5,
      orderStep: 0.5,
    },
    create: {
      tenantId: tenant.id,
      sku: 'PKU-2IN',
      name: 'Paku 2"',
      price: 18000,
      costPrice: 15000,
      unitId: unitBySymbol.kg,
      categoryId: besiCategoryId,
      moq: 0.5,
      orderStep: 0.5,
    },
  });

  if (pakuProduct && unitBySymbol.dus) {
    await prisma.productUnitConversion.upsert({
      where: {
        productId_sellUnitId: {
          productId: pakuProduct.id,
          sellUnitId: unitBySymbol.dus,
        },
      },
      update: {
        conversionToBase: 20,
        isPurchaseUnit: true,
        isSellUnit: true,
        isDefaultSell: false,
      },
      create: {
        tenantId: tenant.id,
        productId: pakuProduct.id,
        sellUnitId: unitBySymbol.dus,
        conversionToBase: 20,
        isPurchaseUnit: true,
        isSellUnit: true,
        isDefaultSell: false,
      },
    });
  }

  // Multi-unit example: Seng Galvalum — beli roll (50 m), jual per meter (step 0.5) + per roll
  const atapCategoryId = categoryByName['Atap & Seng'];
  const sengProduct = await prisma.product.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'SNG-GAL' } },
    update: {
      name: 'Seng Galvalum',
      price: 45000,
      costPrice: 38000,
      unitId: unitBySymbol.m,
      categoryId: atapCategoryId,
      moq: 0.5,
      orderStep: 0.5,
    },
    create: {
      tenantId: tenant.id,
      sku: 'SNG-GAL',
      name: 'Seng Galvalum',
      price: 45000,
      costPrice: 38000,
      unitId: unitBySymbol.m,
      categoryId: atapCategoryId,
      moq: 0.5,
      orderStep: 0.5,
    },
  });

  if (sengProduct && unitBySymbol.roll) {
    await prisma.productUnitConversion.upsert({
      where: {
        productId_sellUnitId: {
          productId: sengProduct.id,
          sellUnitId: unitBySymbol.roll,
        },
      },
      update: {
        conversionToBase: 50,
        isPurchaseUnit: true,
        isSellUnit: true,
        isDefaultSell: false,
      },
      create: {
        tenantId: tenant.id,
        productId: sengProduct.id,
        sellUnitId: unitBySymbol.roll,
        conversionToBase: 50,
        isPurchaseUnit: true,
        isSellUnit: true,
        isDefaultSell: false,
      },
    });
  }

  if (cat5lProduct && unitBySymbol.dus) {
    await prisma.productUnitConversion.upsert({
      where: {
        productId_sellUnitId: {
          productId: cat5lProduct.id,
          sellUnitId: unitBySymbol.dus,
        },
      },
      update: {
        conversionToBase: 4,
        isPurchaseUnit: false,
        isSellUnit: true,
        isDefaultSell: false,
      },
      create: {
        tenantId: tenant.id,
        productId: cat5lProduct.id,
        sellUnitId: unitBySymbol.dus,
        conversionToBase: 4,
        isPurchaseUnit: false,
        isSellUnit: true,
        isDefaultSell: false,
      },
    });
  }

  if (cat5lProduct && semenProduct && pipaProduct) {
    await prisma.productBundle.upsert({
      where: { bundleProductId: cat5lProduct.id },
      update: {
        isActive: true,
        notes: 'Paket renovasi mini',
        items: {
          deleteMany: {},
          create: [
            { componentProductId: semenProduct.id, quantity: 1 },
            { componentProductId: pipaProduct.id, quantity: 1 },
          ],
        },
      },
      create: {
        tenantId: tenant.id,
        bundleProductId: cat5lProduct.id,
        isActive: true,
        notes: 'Paket renovasi mini',
        items: {
          create: [
            { componentProductId: semenProduct.id, quantity: 1 },
            { componentProductId: pipaProduct.id, quantity: 1 },
          ],
        },
      },
    });
  }

  await prisma.supplier.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'PT Semen Nusantara',
      phone: '021-5550100',
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      tenantId: tenant.id,
      name: 'PT Semen Nusantara',
      phone: '021-5550100',
      email: 'order@semen-nusantara.test',
      address: 'Jakarta',
    },
  });

  const seededProducts = await prisma.product.findMany({
    where: { tenantId: tenant.id, hasVariants: false },
    select: { id: true },
  });

  for (const outletId of [outletMain.id, outletNorth.id]) {
    for (const product of seededProducts) {
      await prisma.inventoryItem.upsert({
        where: {
          outletId_productId: {
            outletId,
            productId: product.id,
          },
        },
        update: {
          quantity: 100,
        },
        create: {
          outletId,
          productId: product.id,
          quantity: 100,
          minStock: 5,
        },
      });
    }
  }

  const managerUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: 'manager@barokah.local' },
    select: { id: true },
  });
  if (managerUser) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sampleExpenses = [
      {
        category: ExpenseCategory.OPERATIONAL,
        amount: 150000,
        description: 'Listrik & air toko',
      },
      {
        category: ExpenseCategory.LOADING_UNLOADING,
        amount: 75000,
        description: 'Ongkos bongkar muat semen 40 sak',
      },
      {
        category: ExpenseCategory.SHIPPING,
        amount: 120000,
        description: 'Kirim pipa ke pelanggan kontrak',
      },
    ];
    for (const sample of sampleExpenses) {
      const existing = await prisma.expense.findFirst({
        where: {
          tenantId: tenant.id,
          outletId: outletMain.id,
          category: sample.category,
          description: sample.description,
          expenseDate: today,
        },
      });
      if (!existing) {
        await prisma.expense.create({
          data: {
            tenantId: tenant.id,
            outletId: outletMain.id,
            category: sample.category,
            amount: sample.amount,
            description: sample.description,
            expenseDate: today,
            createdById: managerUser.id,
          },
        });
      }
    }
  }

  console.log('Seed complete:', {
    tenant: tenant.slug,
    outlets: [outletMain.code, outletNorth.code],
    users: users.map((u) => u.email),
    units: units.map((u) => u.symbol),
    categories,
    products: [...sampleProducts.map((p) => p.sku), 'CAT-PARENT', ...catVariants.map((v) => v.sku), 'PKU-2IN'],
    variantParent: catParent.sku,
    pakuExample: 'PKU-2IN (base kg, purchase dus=25kg, sell step 0.5kg)',
    sprint6BundleSeeded: Boolean(cat5lProduct && semenProduct && pipaProduct),
    sprint6UnitConversionSeeded: Boolean(cat5lProduct && unitBySymbol.dus),
    inventoryPerProduct: 100,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
