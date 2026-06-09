import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes } from '@barokah/shared';
import type { UnitConversionDraft } from '@barokah/shared';
import { buildProductSearchWhere, parseProductCsv, type ProductCsvRowError } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreateProductBundleDto } from './dto/create-product-bundle.dto';
import { UpdateProductBundleDto } from './dto/update-product-bundle.dto';
import { CreateProductUnitConversionDto } from './dto/create-product-unit-conversion.dto';
import { ConvertProductQuantityDto } from './dto/convert-product-quantity.dto';
import { UpsertProductBundleOutletPolicyDto } from './dto/upsert-product-bundle-outlet-policy.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { canViewCostPrice } from '../../common/utils/rbac.util';
import { computeBundleEffectiveCost } from '../../common/utils/margin.util';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';
import { ProductGridQueryDto } from './dto/product-grid-query.dto';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listUnits(user: AuthJwtPayload) {
    const rows = await this.prisma.unit.findMany({
      where: { tenantId: user.tenantId },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: {
          select: {
            products: true,
            sellUnitConversions: true,
          },
        },
      },
    });

    return rows.map(({ _count, ...unit }) => ({
      ...unit,
      usage: {
        baseProductCount: _count.products,
        conversionEntryCount: _count.sellUnitConversions,
      },
    }));
  }

  async createUnit(user: AuthJwtPayload, dto: CreateUnitDto) {
    try {
      return await this.prisma.unit.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name.trim(),
          symbol: dto.symbol.trim(),
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Satuan sudah digunakan.');
    }
  }

  async updateUnit(user: AuthJwtPayload, unitId: string, dto: UpdateUnitDto) {
    await this.ensureUnitExists(user.tenantId, unitId);
    try {
      return await this.prisma.unit.update({
        where: { id: unitId },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.symbol ? { symbol: dto.symbol.trim() } : {}),
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Satuan sudah digunakan.');
    }
  }

  async deleteUnit(user: AuthJwtPayload, unitId: string) {
    await this.ensureUnitExists(user.tenantId, unitId);
    try {
      await this.prisma.unit.delete({ where: { id: unitId } });
      return { deleted: true };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2003'
      ) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message:
            'Satuan masih dipakai produk atau konversi beli/jual. Hapus referensi di Master Produk terlebih dahulu.',
        });
      }
      throw error;
    }
  }

  async listCategories(user: AuthJwtPayload, query: ListCategoriesQueryDto = {}) {
    const search = query.search?.trim();
    return this.prisma.category.findMany({
      where: {
        tenantId: user.tenantId,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async listCategoriesSummary(user: AuthJwtPayload) {
    const categories = await this.prisma.category.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            products: {
              where: { isActive: true, hasVariants: false },
            },
          },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      productCount: category._count.products,
    }));
  }

  async createCategory(user: AuthJwtPayload, dto: CreateCategoryDto) {
    if (dto.parentId) {
      await this.ensureCategoryExists(user.tenantId, dto.parentId);
    }
    return this.prisma.category.create({
      data: {
        tenantId: user.tenantId,
        name: dto.name.trim(),
        parentId: dto.parentId ?? null,
      },
    });
  }

  async updateCategory(user: AuthJwtPayload, categoryId: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(user.tenantId, categoryId);
    if (dto.parentId) {
      await this.ensureCategoryExists(user.tenantId, dto.parentId);
    }
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
    });
  }

  async deleteCategory(user: AuthJwtPayload, categoryId: string) {
    await this.ensureCategoryExists(user.tenantId, categoryId);
    await this.prisma.category.delete({ where: { id: categoryId } });
    return { deleted: true };
  }

  async listProducts(user: AuthJwtPayload, query: ListProductsQueryDto = {}) {
    const includeCost = this.shouldIncludeCost(user, query.includeCost);
    const where = this.buildMasterProductWhere(user.tenantId, query);
    const include = {
      unit: { select: { id: true, name: true, symbol: true } },
      category: { select: { id: true, name: true } },
      parentProduct: { select: { id: true, name: true, sku: true } },
      _count: { select: { variants: true } },
      unitConversions: {
        include: { sellUnit: { select: { id: true, name: true, symbol: true } } },
        orderBy: [{ isDefaultSell: 'desc' as const }, { conversionToBase: 'asc' as const }],
      },
      bundleDefinition: {
        include: {
          items: {
            include: {
              componentProduct: { select: { id: true, sku: true, name: true } },
            },
          },
        },
      },
    };

    if (query.page || query.limit) {
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const skip = (page - 1) * limit;
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include,
          orderBy: [{ name: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.product.count({ where }),
      ]);

      return {
        items: products.map((p) => this.mapProductListItem(p, includeCost)),
        meta: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include,
      orderBy: [{ name: 'asc' }],
    });

    return products.map((p) => this.mapProductListItem(p, includeCost));
  }

  async listProductVariants(user: AuthJwtPayload, parentProductId: string) {
    const parent = await this.ensureVariantParent(user.tenantId, parentProductId);
    const variants = await this.prisma.product.findMany({
      where: { tenantId: user.tenantId, parentProductId: parent.id },
      include: {
        unit: { select: { id: true, name: true, symbol: true } },
      },
      orderBy: [{ variantLabel: 'asc' }, { name: 'asc' }],
    });

    return variants.map((v) => this.mapVariantResponse(v, user));
  }

  async createProductVariant(user: AuthJwtPayload, parentProductId: string, dto: CreateProductVariantDto) {
    const parent = await this.ensureVariantParent(user.tenantId, parentProductId);
    if (!parent.unitId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk induk harus memiliki satuan dasar sebelum menambah varian.',
      });
    }

    try {
      const variant = await this.prisma.product.create({
        data: {
          tenantId: user.tenantId,
          sku: dto.sku.trim(),
          barcode: dto.barcode?.trim() || null,
          name: dto.name.trim(),
          variantLabel: dto.variantLabel.trim(),
          price: idrToDecimal(dto.price),
          costPrice: idrToDecimal(dto.costPrice ?? 0),
          unitId: parent.unitId,
          categoryId: parent.categoryId,
          parentProductId: parent.id,
          hasVariants: false,
          isActive: dto.isActive ?? true,
          sellOnline: false,
        },
        include: {
          unit: { select: { id: true, name: true, symbol: true } },
        },
      });
      return this.mapVariantResponse(variant, user);
    } catch (error) {
      this.handlePrismaError(error, 'SKU atau barcode varian sudah terdaftar.');
    }
  }

  async updateProductVariant(
    user: AuthJwtPayload,
    parentProductId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ) {
    await this.ensureVariantParent(user.tenantId, parentProductId);
    await this.ensureVariantBelongsToParent(user.tenantId, parentProductId, variantId);

    try {
      const variant = await this.prisma.product.update({
        where: { id: variantId },
        data: {
          ...(dto.sku ? { sku: dto.sku.trim() } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode?.trim() || null } : {}),
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.variantLabel ? { variantLabel: dto.variantLabel.trim() } : {}),
          ...(dto.price !== undefined ? { price: idrToDecimal(dto.price) } : {}),
          ...(dto.costPrice !== undefined ? { costPrice: idrToDecimal(dto.costPrice) } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        include: {
          unit: { select: { id: true, name: true, symbol: true } },
        },
      });
      return this.mapVariantResponse(variant, user);
    } catch (error) {
      this.handlePrismaError(error, 'SKU atau barcode varian sudah terdaftar.');
    }
  }

  async deleteProductVariant(user: AuthJwtPayload, parentProductId: string, variantId: string) {
    await this.ensureVariantParent(user.tenantId, parentProductId);
    await this.ensureVariantBelongsToParent(user.tenantId, parentProductId, variantId);
    await this.prisma.product.delete({ where: { id: variantId } });
    return { deleted: true };
  }

  async listProductsGrid(user: AuthJwtPayload, query: ProductGridQueryDto = {}) {
    const outletId = query.outletId ? resolveOutletId(user, query.outletId) : this.tryResolveGridOutlet(user);
    const where = this.buildGridProductWhere(user.tenantId, query);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          sku: true,
          name: true,
          price: true,
          imageUrl: true,
          variantLabel: true,
          moq: true,
          orderStep: true,
          unit: { select: { id: true, name: true, symbol: true } },
          category: { select: { id: true, name: true } },
          unitConversions: {
            where: { isSellUnit: true },
            select: {
              sellUnitId: true,
              conversionToBase: true,
              isDefaultSell: true,
              sellStep: true,
              minQty: true,
              sellUnit: { select: { id: true, name: true, symbol: true } },
            },
            orderBy: [{ isDefaultSell: 'desc' }, { conversionToBase: 'asc' }],
          },
          bundleDefinition: {
            select: {
              isActive: true,
              _count: { select: { items: true } },
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
      query.withMeta ? this.prisma.product.count({ where }) : Promise.resolve(undefined),
    ]);

    const inventoryMap = new Map<string, number>();
    if (outletId && products.length > 0) {
      const inventory = await this.prisma.inventoryItem.findMany({
        where: {
          outletId,
          productId: { in: products.map((product) => product.id) },
        },
        select: { productId: true, quantity: true },
      });
      for (const row of inventory) {
        inventoryMap.set(row.productId, Number(row.quantity));
      }
    }

    const items = products.map((p) => this.mapProductGridItem(p, inventoryMap.get(p.id)));

    if (query.withMeta) {
      return { items, total: total ?? items.length };
    }

    return items;
  }

  async createProduct(user: AuthJwtPayload, dto: CreateProductDto) {
    await this.ensureUnitExists(user.tenantId, dto.unitId);
    if (dto.categoryId) {
      await this.ensureCategoryExists(user.tenantId, dto.categoryId);
    }
    await this.validateVariantInput(user.tenantId, {
      parentProductId: dto.parentProductId,
      hasVariants: dto.hasVariants,
      variantLabel: dto.variantLabel,
    });
    try {
      const product = await this.prisma.product.create({
        data: {
          tenantId: user.tenantId,
          sku: dto.sku.trim(),
          barcode: dto.barcode?.trim() || null,
          name: dto.name.trim(),
          price: idrToDecimal(dto.price),
          costPrice: idrToDecimal(dto.costPrice ?? 0),
          unitId: dto.unitId,
          categoryId: dto.categoryId ?? null,
          parentProductId: dto.parentProductId ?? null,
          hasVariants: dto.hasVariants ?? false,
          variantLabel: dto.variantLabel?.trim() || null,
          sellOnline: dto.sellOnline ?? false,
          imageUrl: dto.imageUrl?.trim() || null,
          moq: dto.moq ?? 1,
          orderStep: dto.orderStep ?? 1,
        },
      });
      return {
        ...product,
        price: toIdrInteger(product.price),
        ...(canViewCostPrice(user) ? { costPrice: toIdrInteger(product.costPrice) } : {}),
      };
    } catch (error) {
      this.handlePrismaError(error, 'SKU atau barcode sudah terdaftar.');
    }
  }

  async updateProduct(user: AuthJwtPayload, productId: string, dto: UpdateProductDto) {
    await this.ensureProductExists(user.tenantId, productId);
    if (dto.unitId) {
      await this.ensureUnitExists(user.tenantId, dto.unitId);
    }
    if (dto.categoryId) {
      await this.ensureCategoryExists(user.tenantId, dto.categoryId);
    }
    await this.validateVariantInput(user.tenantId, {
      parentProductId: dto.parentProductId,
      hasVariants: dto.hasVariants,
      variantLabel: dto.variantLabel,
    });
    try {
      const product = await this.prisma.product.update({
        where: { id: productId },
        data: {
          ...(dto.sku ? { sku: dto.sku.trim() } : {}),
          ...(dto.barcode !== undefined ? { barcode: dto.barcode?.trim() || null } : {}),
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.price !== undefined ? { price: idrToDecimal(dto.price) } : {}),
          ...(dto.costPrice !== undefined ? { costPrice: idrToDecimal(dto.costPrice) } : {}),
          ...(dto.unitId ? { unitId: dto.unitId } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId ?? null } : {}),
          ...(dto.parentProductId !== undefined ? { parentProductId: dto.parentProductId || null } : {}),
          ...(dto.hasVariants !== undefined ? { hasVariants: dto.hasVariants } : {}),
          ...(dto.variantLabel !== undefined ? { variantLabel: dto.variantLabel?.trim() || null } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.sellOnline !== undefined ? { sellOnline: dto.sellOnline } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
          ...(dto.moq !== undefined ? { moq: dto.moq } : {}),
          ...(dto.orderStep !== undefined ? { orderStep: dto.orderStep } : {}),
        },
      });
      return {
        ...product,
        price: toIdrInteger(product.price),
        ...(canViewCostPrice(user) ? { costPrice: toIdrInteger(product.costPrice) } : {}),
      };
    } catch (error) {
      this.handlePrismaError(error, 'SKU atau barcode sudah terdaftar.');
    }
  }

  async deleteProduct(user: AuthJwtPayload, productId: string) {
    await this.ensureProductExists(user.tenantId, productId);
    await this.prisma.product.delete({ where: { id: productId } });
    return { deleted: true };
  }

  async lookupProductByCode(user: AuthJwtPayload, code: string) {
    const trimmed = code.trim();
    if (!trimmed) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.VALIDATION_FAILED,
        message: 'Kode SKU/barcode wajib diisi.',
      });
    }

    const product = await this.prisma.product.findFirst({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        hasVariants: false,
        OR: [
          { sku: { equals: trimmed, mode: 'insensitive' } },
          { barcode: { equals: trimmed, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        sku: true,
        barcode: true,
        name: true,
        variantLabel: true,
        price: true,
        category: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, symbol: true } },
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Produk tidak ditemukan untuk SKU/barcode tersebut.',
      });
    }

    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      variantLabel: product.variantLabel,
      price: toIdrInteger(product.price),
      category: product.category,
      unit: product.unit,
    };
  }

  async importProductsFromCsv(
    user: AuthJwtPayload,
    csvContent: string,
    outletId?: string,
  ) {
    const parsed = parseProductCsv(csvContent);
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return {
        imported: 0,
        skipped: 0,
        errors: parsed.errors,
      };
    }

    const resolvedOutletId = outletId ? resolveOutletId(user, outletId) : user.outletIds[0];
    if (!resolvedOutletId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Outlet wajib dipilih untuk import stok awal.',
      });
    }

    const [categories, units, existingProducts] = await Promise.all([
      this.prisma.category.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.unit.findMany({ where: { tenantId: user.tenantId } }),
      this.prisma.product.findMany({
        where: { tenantId: user.tenantId },
        select: { sku: true },
      }),
    ]);

    const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
    const unitByKey = new Map(
      units.flatMap((u) => [
        [u.name.trim().toLowerCase(), u] as const,
        [u.symbol.trim().toLowerCase(), u] as const,
      ]),
    );
    const existingSkus = new Set(existingProducts.map((p) => p.sku.trim().toLowerCase()));

    let imported = 0;
    let skipped = 0;
    const errors: ProductCsvRowError[] = [...parsed.errors];

    for (const row of parsed.rows) {
      const skuKey = row.sku.trim().toLowerCase();
      if (existingSkus.has(skuKey)) {
        skipped += 1;
        errors.push({
          rowNumber: row.rowNumber,
          field: 'sku',
          message: `SKU "${row.sku}" sudah terdaftar — baris dilewati.`,
        });
        continue;
      }

      try {
        let category = categoryByName.get(row.category.trim().toLowerCase());
        if (!category) {
          category = await this.prisma.category.create({
            data: { tenantId: user.tenantId, name: row.category.trim() },
          });
          categoryByName.set(category.name.trim().toLowerCase(), category);
        }

        let unit = unitByKey.get(row.unit.trim().toLowerCase());
        if (!unit) {
          unit = await this.prisma.unit.create({
            data: {
              tenantId: user.tenantId,
              name: row.unit.trim(),
              symbol: row.unit.trim().slice(0, 8),
            },
          });
          unitByKey.set(unit.name.trim().toLowerCase(), unit);
          unitByKey.set(unit.symbol.trim().toLowerCase(), unit);
        }

        const product = await this.prisma.product.create({
          data: {
            tenantId: user.tenantId,
            sku: row.sku.trim(),
            name: row.name.trim(),
            price: idrToDecimal(row.price),
            costPrice: idrToDecimal(0),
            unitId: unit.id,
            categoryId: category.id,
            hasVariants: false,
            isActive: true,
          },
        });

        if (row.stock != null && row.stock > 0) {
          await this.prisma.inventoryItem.upsert({
            where: {
              outletId_productId: { outletId: resolvedOutletId, productId: product.id },
            },
            create: {
              outletId: resolvedOutletId,
              productId: product.id,
              quantity: new Decimal(row.stock),
              minStock: new Decimal(0),
            },
            update: {
              quantity: new Decimal(row.stock),
            },
          });
        }

        existingSkus.add(skuKey);
        imported += 1;
      } catch (error) {
        skipped += 1;
        errors.push({
          rowNumber: row.rowNumber,
          field: 'row',
          message: error instanceof Error ? error.message : 'Gagal import baris.',
        });
      }
    }

    return { imported, skipped, errors };
  }

  async createProductBundle(user: AuthJwtPayload, dto: CreateProductBundleDto) {
    const bundleProduct = await this.prisma.product.findFirst({
      where: { id: dto.bundleProductId, tenantId: user.tenantId, isActive: true },
      select: { id: true, hasVariants: true },
    });
    if (!bundleProduct) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Produk bundle tidak ditemukan.',
      });
    }
    if (bundleProduct.hasVariants) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk induk varian tidak dapat dijadikan bundle.',
      });
    }

    const componentIds = [...new Set(dto.items.map((item) => item.componentProductId))];
    const components = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { in: componentIds },
      },
      select: { id: true, hasVariants: true },
    });
    if (components.length !== componentIds.length) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Ada komponen bundle yang tidak ditemukan.',
      });
    }
    const componentMap = new Map(components.map((component) => [component.id, component]));
    for (const item of dto.items) {
      if (item.componentProductId === dto.bundleProductId) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk bundle tidak boleh menjadi komponen dirinya sendiri.',
        });
      }
      if ((componentMap.get(item.componentProductId) as { hasVariants: boolean }).hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Komponen bundle harus SKU varian jual, bukan produk induk varian.',
        });
      }
    }

    try {
      return await this.prisma.productBundle.upsert({
        where: { bundleProductId: dto.bundleProductId },
        update: {
          isActive: dto.isActive ?? true,
          notes: dto.notes?.trim() || null,
          items: {
            deleteMany: {},
            create: dto.items.map((item) => ({
              componentProductId: item.componentProductId,
              quantity: item.quantity,
            })),
          },
        },
        create: {
          tenantId: user.tenantId,
          bundleProductId: dto.bundleProductId,
          isActive: dto.isActive ?? true,
          notes: dto.notes?.trim() || null,
          items: {
            create: dto.items.map((item) => ({
              componentProductId: item.componentProductId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: {
              componentProduct: { select: { id: true, sku: true, name: true } },
            },
          },
          outletPolicies: {
            include: {
              outlet: { select: { id: true, code: true, name: true } },
            },
            orderBy: [{ outletId: 'asc' }],
          },
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Bundle sudah terdaftar untuk produk ini.');
    }
  }

  async listProductBundles(user: AuthJwtPayload) {
    const includeCost = canViewCostPrice(user);
    const bundles = await this.prisma.productBundle.findMany({
      where: { tenantId: user.tenantId },
      include: {
        bundleProduct: { select: { id: true, sku: true, name: true, price: true, costPrice: true } },
        items: {
          include: {
            componentProduct: {
              select: { id: true, sku: true, name: true, price: true, costPrice: true },
            },
          },
        },
        outletPolicies: {
          include: {
            outlet: { select: { id: true, code: true, name: true } },
          },
          orderBy: [{ outletId: 'asc' }],
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return bundles.map((bundle) => {
      const sellPrice = toIdrInteger(bundle.bundleProduct.price);
      const componentCosts = bundle.items.map((item) => ({
        costPrice: toIdrInteger(item.componentProduct.costPrice),
        quantity: Number(item.quantity),
      }));
      const rolledUpCost = computeBundleEffectiveCost(
        toIdrInteger(bundle.bundleProduct.costPrice),
        componentCosts,
      );
      return {
        id: bundle.id,
        bundleProductId: bundle.bundleProductId,
        isActive: bundle.isActive,
        notes: bundle.notes,
        bundleProduct: {
          id: bundle.bundleProduct.id,
          sku: bundle.bundleProduct.sku,
          name: bundle.bundleProduct.name,
          price: sellPrice,
          ...(includeCost
            ? {
                costPrice: toIdrInteger(bundle.bundleProduct.costPrice),
                rolledUpCost,
                margin: sellPrice - rolledUpCost,
              }
            : {}),
        },
        items: bundle.items.map((item) => ({
          id: item.id,
          componentProductId: item.componentProductId,
          quantity: Number(item.quantity),
          componentProduct: {
            id: item.componentProduct.id,
            sku: item.componentProduct.sku,
            name: item.componentProduct.name,
            price: toIdrInteger(item.componentProduct.price),
            ...(includeCost ? { costPrice: toIdrInteger(item.componentProduct.costPrice) } : {}),
          },
        })),
        outletPolicies: bundle.outletPolicies,
        createdAt: bundle.createdAt,
        updatedAt: bundle.updatedAt,
      };
    });
  }

  async upsertProductBundleOutletPolicy(user: AuthJwtPayload, dto: UpsertProductBundleOutletPolicyDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    await this.ensureOutletExists(user.tenantId, outletId);
    const bundle = await this.prisma.productBundle.findFirst({
      where: {
        tenantId: user.tenantId,
        bundleProductId: dto.bundleProductId,
      },
      select: { id: true },
    });
    if (!bundle) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Bundle produk tidak ditemukan.',
      });
    }

    return this.prisma.productBundleOutletPolicy.upsert({
      where: {
        bundleId_outletId: {
          bundleId: bundle.id,
          outletId,
        },
      },
      update: {
        isActive: dto.isActive,
        notes: dto.notes?.trim() || null,
      },
      create: {
        bundleId: bundle.id,
        outletId,
        isActive: dto.isActive,
        notes: dto.notes?.trim() || null,
      },
      include: {
        outlet: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateProductBundle(user: AuthJwtPayload, bundleProductId: string, dto: UpdateProductBundleDto) {
    const existing = await this.prisma.productBundle.findFirst({
      where: { tenantId: user.tenantId, bundleProductId },
      select: { id: true, bundleProductId: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Bundle produk tidak ditemukan.',
      });
    }

    if (dto.items) {
      await this.validateBundleComponents(user.tenantId, bundleProductId, dto.items);
    }

    try {
      await this.prisma.productBundle.update({
        where: { id: existing.id },
        data: {
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() || null } : {}),
          ...(dto.items
            ? {
                items: {
                  deleteMany: {},
                  create: dto.items.map((item) => ({
                    componentProductId: item.componentProductId,
                    quantity: item.quantity,
                  })),
                },
              }
            : {}),
        },
      });
    } catch (error) {
      this.handlePrismaError(error, 'Gagal memperbarui bundle.');
    }

    const bundles = await this.listProductBundles(user);
    return bundles.find((bundle) => bundle.bundleProductId === bundleProductId) ?? null;
  }

  async deleteProductBundle(user: AuthJwtPayload, bundleProductId: string) {
    const existing = await this.prisma.productBundle.findFirst({
      where: { tenantId: user.tenantId, bundleProductId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Bundle produk tidak ditemukan.',
      });
    }

    await this.prisma.productBundle.delete({ where: { id: existing.id } });
    return { deleted: true, bundleProductId };
  }

  private async validateBundleComponents(
    tenantId: string,
    bundleProductId: string,
    items: Array<{ componentProductId: string; quantity: number }>,
  ) {
    const componentIds = [...new Set(items.map((item) => item.componentProductId))];
    const components = await this.prisma.product.findMany({
      where: {
        tenantId,
        isActive: true,
        id: { in: componentIds },
      },
      select: { id: true, hasVariants: true },
    });
    if (components.length !== componentIds.length) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Ada komponen bundle yang tidak ditemukan.',
      });
    }
    const componentMap = new Map(components.map((component) => [component.id, component]));
    for (const item of items) {
      if (item.componentProductId === bundleProductId) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk bundle tidak boleh menjadi komponen dirinya sendiri.',
        });
      }
      if (componentMap.get(item.componentProductId)?.hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Komponen bundle harus SKU varian jual, bukan produk induk varian.',
        });
      }
    }
  }

  async createProductUnitConversion(user: AuthJwtPayload, dto: CreateProductUnitConversionDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId: user.tenantId, isActive: true },
      select: { id: true, unitId: true, hasVariants: true, parentProductId: true },
    });
    if (!product) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Produk tidak ditemukan.',
      });
    }
    if (product.hasVariants) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk induk varian tidak boleh memiliki konversi satuan. Atur di SKU anak varian.',
      });
    }
    if (!product.unitId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk harus memiliki satuan dasar sebelum menambah konversi.',
      });
    }

    const isPurchaseUnit = dto.isPurchaseUnit ?? false;
    const isSellUnit = dto.isSellUnit ?? !isPurchaseUnit;

    const conversionRow: UnitConversionDraft = {
      unitId: dto.sellUnitId,
      conversionToBase: dto.conversionToBase,
      isPurchaseUnit,
      isSellUnit,
      sellStep: dto.sellStep,
      minQty: dto.minQty,
    };
    const sharedValidation = CatalogService.validateUnitConversions(product.unitId, [conversionRow]);
    if (!sharedValidation.valid) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: sharedValidation.errors[0] ?? 'Konversi satuan tidak valid.',
        details: sharedValidation.errors.map((message, index) => ({
          field: `unitConversions[${index}]`,
          message,
        })),
      });
    }

    if (!isPurchaseUnit && !isSellUnit) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Konversi harus ditandai satuan beli atau satuan jual.',
      });
    }
    if (isPurchaseUnit && isSellUnit && product.unitId === dto.sellUnitId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Satuan beli+jual gabungan harus berbeda dari satuan dasar (stok).',
      });
    }
    if (isPurchaseUnit && product.unitId === dto.sellUnitId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Satuan beli harus berbeda dari satuan dasar (stok).',
      });
    }
    if (isSellUnit && product.unitId === dto.sellUnitId && dto.conversionToBase !== 1) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Konversi satuan dasar jual harus bernilai 1.',
      });
    }

    await this.ensureUnitExists(user.tenantId, dto.sellUnitId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefaultSell) {
        await tx.productUnitConversion.updateMany({
          where: { productId: dto.productId, isSellUnit: true },
          data: { isDefaultSell: false },
        });
      }
      if (isPurchaseUnit) {
        await tx.productUnitConversion.updateMany({
          where: {
            productId: dto.productId,
            isPurchaseUnit: true,
            sellUnitId: { not: dto.sellUnitId },
          },
          data: { isPurchaseUnit: false },
        });
      }
      return tx.productUnitConversion.upsert({
        where: {
          productId_sellUnitId: {
            productId: dto.productId,
            sellUnitId: dto.sellUnitId,
          },
        },
        update: {
          conversionToBase: dto.conversionToBase,
          isPurchaseUnit,
          isSellUnit,
          isDefaultSell: dto.isDefaultSell ?? false,
          sellStep: dto.sellStep ?? null,
          minQty: dto.minQty ?? null,
        },
        create: {
          tenantId: user.tenantId,
          productId: dto.productId,
          sellUnitId: dto.sellUnitId,
          conversionToBase: dto.conversionToBase,
          isPurchaseUnit,
          isSellUnit,
          isDefaultSell: dto.isDefaultSell ?? false,
          sellStep: dto.sellStep ?? null,
          minQty: dto.minQty ?? null,
        },
        include: {
          sellUnit: { select: { id: true, name: true, symbol: true } },
        },
      });
    });
  }

  async listProductUnitConversions(user: AuthJwtPayload, productId?: string) {
    return this.prisma.productUnitConversion.findMany({
      where: {
        tenantId: user.tenantId,
        ...(productId ? { productId } : {}),
      },
      include: {
        product: { select: { id: true, sku: true, name: true, unitId: true } },
        sellUnit: { select: { id: true, name: true, symbol: true } },
      },
      orderBy: [{ productId: 'asc' }, { conversionToBase: 'asc' }],
    });
  }

  async convertProductQuantity(user: AuthJwtPayload, dto: ConvertProductQuantityDto) {
    const conversion = await this.prisma.productUnitConversion.findFirst({
      where: {
        tenantId: user.tenantId,
        productId: dto.productId,
        sellUnitId: dto.sellUnitId,
      },
      include: {
        sellUnit: { select: { id: true, name: true, symbol: true } },
      },
    });
    if (!conversion) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Konversi satuan produk tidak ditemukan.',
      });
    }

    const baseQuantity = Number(conversion.conversionToBase) * dto.sellQuantity;
    return {
      productId: dto.productId,
      sellUnitId: dto.sellUnitId,
      sellUnit: conversion.sellUnit,
      sellQuantity: dto.sellQuantity,
      conversionToBase: Number(conversion.conversionToBase),
      baseQuantity,
    };
  }

  private async ensureUnitExists(tenantId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({ where: { id, tenantId } });
    if (!unit) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Satuan tidak ditemukan.',
      });
    }
  }

  private async ensureCategoryExists(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Kategori tidak ditemukan.',
      });
    }
  }

  private async ensureProductExists(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Produk tidak ditemukan.',
      });
    }
  }

  private async ensureOutletExists(tenantId: string, id: string) {
    const outlet = await this.prisma.outlet.findFirst({ where: { id, tenantId } });
    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Outlet tidak ditemukan.',
      });
    }
  }

  private static validateUnitConversions(baseUnitId: string, conversions: UnitConversionDraft[]) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateUnitConversions: validateFn } = require('@barokah/shared/dist/utils/product-type') as {
      validateUnitConversions: (
        baseUnitId: string,
        rows: UnitConversionDraft[],
      ) => { valid: boolean; errors: string[] };
    };
    return validateFn(baseUnitId, conversions);
  }

  private async validateVariantInput(
    tenantId: string,
    payload: { parentProductId?: string; hasVariants?: boolean; variantLabel?: string },
  ) {
    if (payload.hasVariants && payload.parentProductId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk induk varian tidak boleh memiliki parent product.',
      });
    }

    if (!payload.parentProductId && payload.variantLabel?.trim()) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Label varian hanya boleh diisi untuk produk turunan varian.',
      });
    }

    if (payload.parentProductId) {
      const parent = await this.prisma.product.findFirst({
        where: { id: payload.parentProductId, tenantId, isActive: true },
        select: { id: true, hasVariants: true },
      });
      if (!parent) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Produk induk varian tidak ditemukan.',
        });
      }
      if (!parent.hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk induk belum ditandai memiliki varian.',
        });
      }
    }
  }

  private shouldIncludeCost(user: AuthJwtPayload, includeCost?: boolean): boolean {
    if (!canViewCostPrice(user)) {
      return false;
    }
    return includeCost !== false;
  }

  private tryResolveGridOutlet(user: AuthJwtPayload): string | undefined {
    if (user.outletIds.length === 1) {
      return user.outletIds[0];
    }
    return undefined;
  }

  private buildGridProductWhere(tenantId: string, query: ProductGridQueryDto) {
    const searchWhere = buildProductSearchWhere(query.q);
    return {
      tenantId,
      isActive: true,
      hasVariants: false,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(searchWhere ?? {}),
    };
  }

  private buildMasterProductWhere(tenantId: string, query: ListProductsQueryDto) {
    const searchWhere = buildProductSearchWhere(query.q);
    return {
      tenantId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(searchWhere ?? {}),
    };
  }

  private mapPurchaseUnit(
    unitConversions: Array<{
      sellUnitId: string;
      conversionToBase: Decimal;
      isPurchaseUnit: boolean;
      sellUnit: { id: string; name: string; symbol: string };
    }>,
  ) {
    const purchase = unitConversions.find((row) => row.isPurchaseUnit);
    if (!purchase) {
      return undefined;
    }
    return {
      id: purchase.sellUnit.id,
      name: purchase.sellUnit.name,
      symbol: purchase.sellUnit.symbol,
      conversionToBase: Number(purchase.conversionToBase),
    };
  }

  private mapSellUnits(
    unitConversions: Array<{
      sellUnitId: string;
      conversionToBase: Decimal;
      isSellUnit: boolean;
      isDefaultSell: boolean;
      sellStep: Decimal | null;
      minQty: Decimal | null;
      sellUnit: { id: string; name: string; symbol: string };
    }>,
    baseUnit: { id: string; name: string; symbol: string } | null,
    basePrice: number,
    productMoq: number,
    productOrderStep: number,
  ) {
    const sellRows = unitConversions.filter((row) => row.isSellUnit);
    const mapped = sellRows.map((conversion) => ({
      id: conversion.sellUnit.id,
      name: conversion.sellUnit.name,
      symbol: conversion.sellUnit.symbol,
      conversionToBase: Number(conversion.conversionToBase),
      price: Math.round(basePrice * Number(conversion.conversionToBase)),
      sellStep: Number(conversion.sellStep ?? productOrderStep),
      minQty: Number(conversion.minQty ?? productMoq),
      isDefault: conversion.isDefaultSell,
    }));

    if (baseUnit && !mapped.some((row) => row.id === baseUnit.id)) {
      mapped.unshift({
        id: baseUnit.id,
        name: baseUnit.name,
        symbol: baseUnit.symbol,
        conversionToBase: 1,
        price: basePrice,
        sellStep: productOrderStep,
        minQty: productMoq,
        isDefault: mapped.every((row) => !row.isDefault),
      });
    }

    return mapped;
  }

  private mapBundleItems(
    bundleDefinition: {
      isActive: boolean;
      items: Array<{
        componentProductId: string;
        quantity: Decimal;
        componentProduct: { id: string; sku: string; name: string };
      }>;
    } | null,
  ) {
    if (!bundleDefinition?.isActive || bundleDefinition.items.length === 0) {
      return undefined;
    }
    return bundleDefinition.items.map((item) => ({
      productId: item.componentProductId,
      sku: item.componentProduct.sku,
      name: item.componentProduct.name,
      quantity: Number(item.quantity),
    }));
  }

  private mapBundlePolicy(
    bundleDefinition: {
      isActive: boolean;
      items: unknown[];
      outletPolicies: Array<{
        isActive: boolean;
        outletId: string;
        outlet: { id: string; name: string };
      }>;
    } | null,
    outletId?: string,
  ) {
    if (!bundleDefinition?.isActive || bundleDefinition.items.length === 0) {
      return null;
    }
    const outletPolicy = outletId
      ? bundleDefinition.outletPolicies.find((policy) => policy.outletId === outletId)
      : undefined;
    if (outletPolicy) {
      return {
        scope: 'OUTLET' as const,
        outletId: outletPolicy.outletId,
        outletName: outletPolicy.outlet.name,
        behavior: outletPolicy.isActive ? ('ALLOW' as const) : ('BLOCK' as const),
        message: outletPolicy.isActive
          ? 'Bundle aktif di outlet ini.'
          : 'Bundle nonaktif di outlet ini.',
      };
    }
    return {
      scope: 'TENANT' as const,
      behavior: bundleDefinition.isActive ? ('ALLOW' as const) : ('BLOCK' as const),
      message: bundleDefinition.isActive ? 'Bundle aktif tenant-wide.' : 'Bundle nonaktif.',
    };
  }

  private mapProductListItem(
    p: {
      id: string;
      sku: string;
      barcode: string | null;
      name: string;
      price: Decimal;
      costPrice: Decimal;
      unitId: string | null;
      categoryId: string | null;
      parentProductId: string | null;
      variantLabel: string | null;
      hasVariants: boolean;
      isActive: boolean;
      sellOnline: boolean;
      imageUrl: string | null;
      moq: Decimal;
      orderStep: Decimal;
      unit: { id: string; name: string; symbol: string } | null;
      category: { id: string; name: string } | null;
      parentProduct: { id: string; name: string; sku: string } | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { variants: number };
      unitConversions: Array<{
        sellUnitId: string;
        conversionToBase: Decimal;
        isPurchaseUnit: boolean;
        isSellUnit: boolean;
        isDefaultSell: boolean;
        sellStep: Decimal | null;
        minQty: Decimal | null;
        sellUnit: { id: string; name: string; symbol: string };
      }>;
      bundleDefinition: {
        isActive: boolean;
        items: Array<{
          componentProductId: string;
          quantity: Decimal;
          componentProduct: { id: string; sku: string; name: string };
        }>;
      } | null;
    },
    includeCost: boolean,
  ) {
    const price = toIdrInteger(p.price);
    const moq = Number(p.moq);
    const orderStep = Number(p.orderStep);
    const bundleItems = this.mapBundleItems(p.bundleDefinition);
    const purchaseUnit = this.mapPurchaseUnit(p.unitConversions ?? []);
    const sellUnits = this.mapSellUnits(
      p.unitConversions ?? [],
      p.unit,
      price,
      moq,
      orderStep,
    );
    return {
      id: p.id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      price,
      moq,
      orderStep,
      ...(includeCost ? { costPrice: toIdrInteger(p.costPrice) } : {}),
      unitId: p.unitId,
      categoryId: p.categoryId,
      parentProductId: p.parentProductId,
      variantLabel: p.variantLabel,
      hasVariants: p.hasVariants,
      variantCount: p.hasVariants ? p._count.variants : 0,
      isActive: p.isActive,
      sellOnline: p.sellOnline,
      imageUrl: p.imageUrl,
      unit: p.unit,
      baseUnit: p.unit,
      category: p.category,
      parentProduct: p.parentProduct,
      ...(purchaseUnit ? { purchaseUnit } : {}),
      ...(sellUnits.length > 0 ? { sellUnits } : {}),
      ...(bundleItems ? { bundleItems } : {}),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }

  private mapProductGridItem(
    p: {
      id: string;
      sku: string;
      name: string;
      price: Decimal;
      imageUrl: string | null;
      variantLabel: string | null;
      moq: Decimal;
      orderStep: Decimal;
      unit: { id: string; name: string; symbol: string } | null;
      category: { id: string; name: string } | null;
      unitConversions: Array<{
        sellUnitId: string;
        conversionToBase: Decimal;
        isDefaultSell: boolean;
        sellStep: Decimal | null;
        minQty: Decimal | null;
        sellUnit: { id: string; name: string; symbol: string };
      }>;
      bundleDefinition: {
        isActive: boolean;
        _count: { items: number };
      } | null;
    },
    stockQty?: number,
  ) {
    const price = toIdrInteger(p.price);
    const moq = Number(p.moq ?? 1);
    const orderStep = Number(p.orderStep ?? 1);
    const sellUnits = this.mapSellUnits(
      (p.unitConversions ?? []).map((row) => ({
        ...row,
        isSellUnit: true,
        isPurchaseUnit: false,
      })),
      p.unit,
      price,
      moq,
      orderStep,
    );
    const isBundle = Boolean(p.bundleDefinition?.isActive && p.bundleDefinition._count.items > 0);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price,
      moq,
      orderStep,
      variantLabel: p.variantLabel,
      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
      unit: p.unit,
      category: p.category,
      ...(sellUnits.length > 0 ? { sellUnits } : {}),
      ...(isBundle ? { isBundle: true } : {}),
      ...(stockQty != null ? { stockQty } : {}),
    };
  }

  private mapVariantResponse(
    variant: {
      id: string;
      sku: string;
      barcode: string | null;
      name: string;
      variantLabel: string | null;
      price: Decimal;
      costPrice: Decimal;
      isActive: boolean;
      parentProductId: string | null;
      unit: { id: string; name: string; symbol: string } | null;
      createdAt: Date;
      updatedAt: Date;
    },
    user: AuthJwtPayload,
  ) {
    return {
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      name: variant.name,
      variantLabel: variant.variantLabel,
      price: toIdrInteger(variant.price),
      ...(canViewCostPrice(user) ? { costPrice: toIdrInteger(variant.costPrice) } : {}),
      isActive: variant.isActive,
      parentProductId: variant.parentProductId,
      unit: variant.unit,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }

  private async ensureVariantParent(tenantId: string, parentProductId: string) {
    const parent = await this.prisma.product.findFirst({
      where: { id: parentProductId, tenantId },
      select: {
        id: true,
        hasVariants: true,
        unitId: true,
        categoryId: true,
        name: true,
      },
    });
    if (!parent) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Produk induk tidak ditemukan.',
      });
    }
    if (!parent.hasVariants) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Produk ini bukan produk induk varian.',
      });
    }
    return parent;
  }

  private async ensureVariantBelongsToParent(tenantId: string, parentProductId: string, variantId: string) {
    const variant = await this.prisma.product.findFirst({
      where: { id: variantId, tenantId, parentProductId },
      select: { id: true },
    });
    if (!variant) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Varian produk tidak ditemukan.',
      });
    }
  }

  private handlePrismaError(error: unknown, message: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new ConflictException({
        code: ErrorCodes.DUPLICATE_ENTRY,
        message,
      });
    }
    throw error;
  }
}
