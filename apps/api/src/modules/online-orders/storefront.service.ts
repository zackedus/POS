import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes, ONLINE_DELIVERY_FLAT_FEE, TAX_RATE, calculateOnlineCodSplit, isWithinOnlineOrderHours, mergeStorefrontSettings, resolveOnlineOrderChargeAmount, type StorefrontPublicConfig, type StorefrontSettings } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import type { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import type { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';
import { MidtransService, type MidtransRuntimeConfig } from './midtrans.service';
import { OnlineOrdersService } from './online-orders.service';
import { CustomersService } from '../customers/customers.service';
import { StorefrontCustomerAuthService } from './storefront-customer-auth.service';
import type { StorefrontCustomerJwtPayload } from './storefront-customer-auth.types';
import {
  buildOrderNo,
  formatPhoneDisplay,
  getJakartaDateKey,
  normalizePhone,
  orderStatusLabel,
  paymentExpiresAt,
} from './online-order.util';

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly midtrans: MidtransService,
    private readonly onlineOrdersService: OnlineOrdersService,
    private readonly customersService: CustomersService,
    private readonly storefrontCustomerAuth: StorefrontCustomerAuthService,
  ) {}

  private async resolveTenant(slug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko tidak ditemukan.',
      });
    }
    return tenant;
  }

  private async resolveTenantMidtransConfig(tenantId: string): Promise<MidtransRuntimeConfig> {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return {
      serverKey: settings?.midtransServerKey,
      isProduction: settings?.midtransIsProduction,
    };
  }

  private async resolveStorefrontSettings(tenantId: string, tenantName: string): Promise<StorefrontSettings> {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return mergeStorefrontSettings(settings?.storefrontSettings, tenantName);
  }

  private async resolveMidtransMode(tenantId: string): Promise<'mock' | 'sandbox' | 'live'> {
    const settings = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    const config = await this.resolveTenantMidtransConfig(tenantId);
    const envKey = process.env.MIDTRANS_SERVER_KEY?.trim();
    const tenantKey = settings?.midtransServerKey?.trim();
    const effectiveKey = tenantKey || envKey || config.serverKey?.trim() || null;
    if (!effectiveKey) return 'mock';
    const isProduction = settings?.midtransIsProduction ?? config.isProduction ?? false;
    return isProduction ? 'live' : 'sandbox';
  }

  private filterEnabledOutlets<T extends { id: string }>(outlets: T[], settings: StorefrontSettings): T[] {
    if (settings.branches.enabledOutletIds.length === 0) return outlets;
    const allowed = new Set(settings.branches.enabledOutletIds);
    return outlets.filter((outlet) => allowed.has(outlet.id));
  }

  async getConfig(tenantSlug: string): Promise<StorefrontPublicConfig> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        contactPhone: true,
        whatsapp: true,
        logoUrl: true,
      },
    });
    if (!tenant) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko tidak ditemukan.',
      });
    }

    const settings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    const featuredIds = settings.catalog.featuredCategoryIds;
    const categories = featuredIds.length
      ? await this.prisma.category.findMany({
          where: { tenantId: tenant.id, id: { in: featuredIds } },
          select: { id: true, name: true },
          orderBy: { sortOrder: 'asc' },
        })
      : await this.prisma.category.findMany({
          where: {
            tenantId: tenant.id,
            products: { some: { sellOnline: true, isActive: true } },
          },
          select: { id: true, name: true },
          orderBy: { sortOrder: 'asc' },
          take: 6,
        });

    return {
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description ?? '',
        contactPhone: tenant.contactPhone,
        whatsapp: tenant.whatsapp,
        logoUrl: tenant.logoUrl,
      },
      settings,
      storefrontUrl: `/store/${tenant.slug}`,
      midtransMode: await this.resolveMidtransMode(tenant.id),
      featuredCategories: categories,
    };
  }

  private async assertStorefrontAcceptingOrders(settings: StorefrontSettings) {
    if (!settings.enabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko online sedang tidak aktif.',
      });
    }
    if (settings.operations.temporarilyClosed) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: settings.operations.closedMessage || 'Toko online sedang tutup sementara.',
      });
    }
    if (!isWithinOnlineOrderHours(settings)) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: settings.operations.closedMessage || 'Di luar jam order online.',
      });
    }
  }

  async listOutlets(tenantSlug: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const settings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    const outlets = await this.prisma.outlet.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, code: true, address: true, operatingHours: true },
      orderBy: { name: 'asc' },
    });
    const filtered = this.filterEnabledOutlets(outlets, settings);
    return {
      outlets: filtered.map((outlet) => ({
        id: outlet.id,
        name: outlet.name,
        code: outlet.code,
        address: outlet.address ?? '',
        pickupHoursLabel: outlet.operatingHours ?? 'Senin–Sabtu 08:00–17:00',
      })),
    };
  }

  async listCategories(tenantSlug: string, outletId: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const settings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    await this.assertOutletBelongsToTenant(tenant.id, outletId, settings);

    const categories = await this.prisma.category.findMany({
      where: {
        tenantId: tenant.id,
        products: {
          some: {
            sellOnline: true,
            isActive: true,
            parentProductId: null,
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      categories: [{ id: 'all', name: 'Semua' }, ...categories],
    };
  }

  async listProducts(tenantSlug: string, query: CatalogProductsQueryDto) {
    const tenant = await this.resolveTenant(tenantSlug);
    const settings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    await this.assertOutletBelongsToTenant(tenant.id, query.outletId, settings);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sort = query.sort ?? settings.catalog.defaultSort;

    const where = {
      tenantId: tenant.id,
      sellOnline: true,
      isActive: true,
      OR: [{ hasVariants: true }, { hasVariants: false, parentProductId: null }],
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.q?.trim()
        ? {
            OR: [
              { name: { contains: query.q.trim(), mode: 'insensitive' as const } },
              { sku: { contains: query.q.trim(), mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const orderBy =
      sort === 'price_desc'
        ? { price: 'desc' as const }
        : sort === 'price_asc'
          ? { price: 'asc' as const }
          : sort === 'name_desc'
            ? { name: 'desc' as const }
            : { name: 'asc' as const };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          imageUrl: true,
          webPlaceholderKey: true,
          moq: true,
          orderStep: true,
          hasVariants: true,
          unit: { select: { symbol: true } },
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, variantLabel: true, price: true },
            orderBy: { price: 'asc' },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const productIds = products.flatMap((p) =>
      p.hasVariants ? p.variants.map((variant) => variant.id) : [p.id],
    );
    const inventory = productIds.length
      ? await this.prisma.inventoryItem.findMany({
          where: { outletId: query.outletId, productId: { in: productIds } },
          select: { productId: true, quantity: true },
        })
      : [];
    const stockMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));
    const asOf = new Date().toISOString();

    return {
      items: products
        .map((product) => {
        const displayPrice =
          product.hasVariants && product.variants[0]
            ? toIdrInteger(product.variants[0].price)
            : toIdrInteger(product.price);
        const qty = product.hasVariants
          ? product.variants.reduce((sum, variant) => sum + (stockMap.get(variant.id) ?? 0), 0)
          : stockMap.get(product.id) ?? 0;
        const variantSummary = product.hasVariants
          ? product.variants.map((variant) => ({
              id: variant.id,
              name: variant.variantLabel ?? variant.name,
              price: toIdrInteger(variant.price),
              stock: stockMap.get(variant.id) ?? 0,
            }))
          : undefined;
        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          unitSymbol: product.unit?.symbol ?? 'pcs',
          price: displayPrice,
          imageUrl: product.imageUrl,
          placeholderKey: product.webPlaceholderKey ?? 'generic-building',
          stockStatus: qty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
          stockQty: null,
          moq: product.moq,
          orderStep: product.orderStep,
          hasVariants: product.hasVariants,
          ...(product.hasVariants
            ? { fromPrice: displayPrice, variantSummary }
            : {}),
          cacheHint: { asOf, ttlSeconds: CACHE_TTL_SECONDS },
        };
      })
        .filter((item) => settings.catalog.showOutOfStock || item.stockStatus === 'AVAILABLE'),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProduct(tenantSlug: string, productId: string, outletId: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const settings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    await this.assertOutletBelongsToTenant(tenant.id, outletId, settings);

    const requested = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: tenant.id,
        isActive: true,
      },
      select: {
        id: true,
        parentProductId: true,
        sellOnline: true,
        parentProduct: {
          select: { id: true, sellOnline: true, isActive: true },
        },
      },
    });

    if (!requested) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_PRODUCT_NOT_AVAILABLE,
        message: 'Produk tidak tersedia di toko online.',
      });
    }

    const resolvedProductId = requested.parentProductId ?? requested.id;
    const parentSellOnline = requested.parentProductId
      ? requested.parentProduct?.sellOnline
      : requested.sellOnline;
    const parentActive = requested.parentProductId
      ? requested.parentProduct?.isActive
      : true;

    if (!parentSellOnline || parentActive === false) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_PRODUCT_NOT_AVAILABLE,
        message: 'Produk tidak tersedia di toko online.',
      });
    }

    const preselectedVariantId = requested.parentProductId ? requested.id : undefined;

    const product = await this.prisma.product.findFirst({
      where: {
        id: resolvedProductId,
        tenantId: tenant.id,
        sellOnline: true,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        imageUrl: true,
        webPlaceholderKey: true,
        moq: true,
        orderStep: true,
        hasVariants: true,
        categoryId: true,
        unit: { select: { symbol: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            variantLabel: true,
            price: true,
            moq: true,
            orderStep: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_PRODUCT_NOT_AVAILABLE,
        message: 'Produk tidak tersedia di toko online.',
      });
    }

    const asOf = new Date().toISOString();

    const relatedProducts = product.categoryId
      ? await this.prisma.product.findMany({
          where: {
            tenantId: tenant.id,
            sellOnline: true,
            isActive: true,
            categoryId: product.categoryId,
            id: { not: product.id },
            hasVariants: false,
          },
          take: 4,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            price: true,
            unit: { select: { symbol: true } },
            imageUrl: true,
            webPlaceholderKey: true,
          },
        })
      : [];

    const related = relatedProducts.map((item) => ({
      id: item.id,
      name: item.name,
      price: toIdrInteger(item.price),
      unitSymbol: item.unit?.symbol ?? 'pcs',
      imageUrl: item.imageUrl,
      placeholderKey: item.webPlaceholderKey ?? 'generic-building',
    }));

    if (product.hasVariants) {
      const variantIds = product.variants.map((variant) => variant.id);
      const inventory = variantIds.length
        ? await this.prisma.inventoryItem.findMany({
            where: { outletId, productId: { in: variantIds } },
            select: { productId: true, quantity: true },
          })
        : [];
      const stockMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));
      const variants = product.variants.map((variant) => {
        const qty = stockMap.get(variant.id) ?? 0;
        return {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          variantLabel: variant.variantLabel,
          price: toIdrInteger(variant.price),
          moq: variant.moq,
          orderStep: variant.orderStep,
          stockStatus: qty > 0 ? ('AVAILABLE' as const) : ('OUT_OF_STOCK' as const),
        };
      });
      const minPrice = variants.length > 0 ? Math.min(...variants.map((variant) => variant.price)) : 0;
      const anyAvailable = variants.some((variant) => variant.stockStatus === 'AVAILABLE');

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unitSymbol: product.unit?.symbol ?? 'pcs',
        price: minPrice,
        imageUrl: product.imageUrl,
        placeholderKey: product.webPlaceholderKey ?? 'generic-building',
        stockStatus: anyAvailable ? 'AVAILABLE' : 'OUT_OF_STOCK',
        moq: product.moq,
        orderStep: product.orderStep,
        hasVariants: true,
        variants,
        ...(preselectedVariantId ? { selectedVariantId: preselectedVariantId } : {}),
        relatedProducts: related,
        cacheHint: { asOf, ttlSeconds: CACHE_TTL_SECONDS },
      };
    }

    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { outletId_productId: { outletId, productId: product.id } },
      select: { quantity: true },
    });
    const qty = Number(inventory?.quantity ?? 0);

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitSymbol: product.unit?.symbol ?? 'pcs',
      price: toIdrInteger(product.price),
      imageUrl: product.imageUrl,
      placeholderKey: product.webPlaceholderKey ?? 'generic-building',
      stockStatus: qty > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
      moq: product.moq,
      orderStep: product.orderStep,
      hasVariants: false,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        variantLabel: variant.variantLabel,
        price: toIdrInteger(variant.price),
        moq: variant.moq,
        orderStep: variant.orderStep,
      })),
      relatedProducts: related,
      cacheHint: { asOf, ttlSeconds: CACHE_TTL_SECONDS },
    };
  }

  async createOrder(
    tenantSlug: string,
    dto: CreateOnlineOrderDto,
    authenticatedCustomer: StorefrontCustomerJwtPayload | null = null,
  ) {
    if (dto.website?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Permintaan checkout tidak dapat diproses.',
      });
    }

    const tenant = await this.resolveTenant(tenantSlug);
    const storefrontSettings = await this.resolveStorefrontSettings(tenant.id, tenant.name);
    await this.assertStorefrontAcceptingOrders(storefrontSettings);

    const requireLogin = storefrontSettings.checkout.requireCustomerLogin !== false;
    if (requireLogin) {
      if (!authenticatedCustomer || authenticatedCustomer.tenantSlug !== tenantSlug) {
        throw new UnauthorizedException({
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Login pelanggan wajib sebelum checkout. Daftar atau masuk terlebih dahulu.',
        });
      }
    } else if (
      authenticatedCustomer &&
      authenticatedCustomer.tenantSlug !== tenantSlug
    ) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Sesi tidak valid untuk toko ini.',
      });
    }

    if (dto.fulfillmentType === 'DELIVERY' && !storefrontSettings.branches.deliveryEnabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: 'Pengiriman ke alamat tidak tersedia saat ini.',
      });
    }
    if (dto.fulfillmentType === 'PICKUP' && !storefrontSettings.branches.pickupEnabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: 'Pickup di toko tidak tersedia saat ini.',
      });
    }
    if (!storefrontSettings.payment.onlinePaymentEnabled && !storefrontSettings.payment.codEnabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: 'Pembayaran online sedang dinonaktifkan.',
      });
    }

    const paymentMode = dto.paymentMode ?? 'FULL_ONLINE';
    if (paymentMode === 'COD') {
      if (dto.fulfillmentType !== 'DELIVERY') {
        throw new UnprocessableEntityException({
          code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
          message: 'COD hanya tersedia untuk pesanan antar ke alamat.',
        });
      }
      if (!storefrontSettings.payment.codEnabled) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
          message: 'Pembayaran COD sedang dinonaktifkan.',
        });
      }
    } else if (!storefrontSettings.payment.onlinePaymentEnabled) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: 'Pembayaran online penuh sedang dinonaktifkan. Pilih COD jika tersedia.',
      });
    }

    const existing = await this.prisma.onlineOrder.findUnique({
      where: {
        tenantId_clientRequestId: {
          tenantId: tenant.id,
          clientRequestId: dto.clientRequestId,
        },
      },
      include: { outlet: true, items: true, payments: true },
    });
    if (existing) {
      const midtransConfig = await this.resolveTenantMidtransConfig(tenant.id);
      const chargeAmount = resolveOnlineOrderChargeAmount(
        (existing as { paymentMode?: 'FULL_ONLINE' | 'COD' }).paymentMode ?? 'FULL_ONLINE',
        toIdrInteger(existing.total),
        existing.depositAmount != null ? toIdrInteger(existing.depositAmount) : null,
      );
      return this.buildCreateOrderResponse(existing, tenant.slug, await this.midtrans.createSnapPayment({
        orderId: existing.midtransOrderId ?? existing.orderNo,
        orderNo: existing.orderNo,
        tenantSlug: tenant.slug,
        grossAmount: chargeAmount,
        customerName: existing.customerName,
        customerPhone: formatPhoneDisplay(existing.customerPhone),
      }, midtransConfig));
    }

    const outlet = await this.prisma.outlet.findFirst({
      where: { id: dto.outletId, tenantId: tenant.id, isActive: true },
    });
    if (!outlet) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: 'Data checkout tidak valid.',
      });
    }

    const mergedItems = dto.items.reduce<Map<string, number>>((acc, item) => {
      acc.set(item.productId, (acc.get(item.productId) ?? 0) + item.quantity);
      return acc;
    }, new Map());
    const productIds = [...mergedItems.keys()];

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: tenant.id,
        id: { in: productIds },
        isActive: true,
        hasVariants: false,
        OR: [
          { sellOnline: true, parentProductId: null },
          {
            parentProductId: { not: null },
            parentProduct: { sellOnline: true, isActive: true },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        moq: true,
        orderStep: true,
        unit: { select: { symbol: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        throw new NotFoundException({
          code: ErrorCodes.ONLINE_PRODUCT_NOT_AVAILABLE,
          message: 'Produk tidak tersedia di toko online.',
        });
      }
    }

    for (const [productId, quantity] of mergedItems) {
      const product = productMap.get(productId)!;
      const moq = Number(product.moq);
      const orderStep = Number(product.orderStep);
      const stepsFromMin = orderStep > 0 ? (quantity - moq) / orderStep : 0;
      if (
        quantity + 1e-9 < moq ||
        (orderStep > 0 && (stepsFromMin < -1e-9 || Math.abs(stepsFromMin - Math.round(stepsFromMin)) > 1e-6))
      ) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
          message: `Qty ${product.name} tidak memenuhi MOQ/kelipatan.`,
        });
      }
    }

    const inventory = await this.prisma.inventoryItem.findMany({
      where: { outletId: dto.outletId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    });
    const stockMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    const stockIssues: Array<{ productId: string; name: string; requested: number; available: number }> = [];
    for (const [productId, quantity] of mergedItems) {
      const available = stockMap.get(productId) ?? 0;
      if (quantity > available) {
        stockIssues.push({
          productId,
          name: productMap.get(productId)!.name,
          requested: quantity,
          available,
        });
      }
    }
    if (stockIssues.length > 0) {
      throw new ConflictException({
        code: ErrorCodes.INSUFFICIENT_STOCK,
        message: 'Stok produk tidak mencukupi.',
        details: stockIssues.map((issue) => ({
          field: `items.${issue.productId}`,
          message: `${issue.name}: butuh ${issue.requested}, ada ${issue.available}.`,
        })),
      });
    }

    let subtotal = 0;
    const lineItems = productIds.map((productId) => {
      const product = productMap.get(productId)!;
      const quantity = mergedItems.get(productId) as number;
      const unitPrice = toIdrInteger(product.price);
      const lineSubtotal = unitPrice * quantity;
      subtotal += lineSubtotal;
      return {
        productId,
        productName: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        lineSubtotal,
      };
    });

    const tax = Math.round(subtotal * TAX_RATE);
    const shippingFee = dto.fulfillmentType === 'DELIVERY' ? ONLINE_DELIVERY_FLAT_FEE : 0;
    const total = subtotal + tax + shippingFee;
    const codSplit = paymentMode === 'COD' ? calculateOnlineCodSplit(total) : null;
    const chargeAmount = codSplit?.depositAmount ?? total;

    if (subtotal < storefrontSettings.checkout.minOrderAmount) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
        message: `Minimum order ${storefrontSettings.checkout.minOrderAmount.toLocaleString('id-ID')} rupiah.`,
      });
    }

    let deliveryAddress: {
      street: string;
      district: string;
      city: string;
      postalCode?: string;
    } | null = null;

    if (dto.fulfillmentType === 'DELIVERY') {
      if (requireLogin && authenticatedCustomer) {
        if (!dto.customerAddressId) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
            message: 'Pilih alamat pengiriman tersimpan atau tambah alamat baru.',
          });
        }
        const saved = await this.storefrontCustomerAuth.resolveCustomerAddress(
          authenticatedCustomer.sub,
          tenant.id,
          dto.customerAddressId,
        );
        deliveryAddress = {
          street: saved.addressLine1,
          district: saved.province?.trim() || saved.addressLine2?.trim() || '-',
          city: saved.city,
          ...(saved.postalCode?.trim() ? { postalCode: saved.postalCode.trim() } : {}),
        };
      } else if (dto.deliveryAddress) {
        deliveryAddress = {
          street: dto.deliveryAddress.street.trim(),
          district: dto.deliveryAddress.district.trim(),
          city: dto.deliveryAddress.city.trim(),
          ...(dto.deliveryAddress.postalCode?.trim()
            ? { postalCode: dto.deliveryAddress.postalCode.trim() }
            : {}),
        };
      } else if (storefrontSettings.checkout.requireAddress !== false) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.ONLINE_CHECKOUT_INVALID,
          message: 'Alamat pengiriman wajib diisi.',
        });
      }
    }

    const expiresAt = paymentExpiresAt();
    const dateKey = getJakartaDateKey();

    let customerRecord: { id: string; name: string; phone: string };
    if (authenticatedCustomer) {
      const profile = await this.prisma.customer.findFirst({
        where: { id: authenticatedCustomer.sub, tenantId: tenant.id },
        select: { id: true, name: true, phone: true },
      });
      if (!profile) {
        throw new UnauthorizedException({
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Akun pelanggan tidak ditemukan.',
        });
      }
      customerRecord = profile;
    } else {
      customerRecord = await this.customersService.findOrCreateByPhone(
        tenant.id,
        dto.customer.name,
        dto.customer.phone,
      );
    }

    const normalizedPhone = customerRecord.phone;
    const customerName = dto.customer.name.trim() || customerRecord.name;

    const order = await this.prisma.$transaction(async (tx) => {
      const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);
      const sequence = await tx.onlineOrderSequence.upsert({
        where: {
          tenantId_sequenceDate: { tenantId: tenant.id, sequenceDate },
        },
        create: { tenantId: tenant.id, sequenceDate, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const orderNo = buildOrderNo(dateKey, sequence.lastValue);
      const midtransOrderId = orderNo;

      const created = await tx.onlineOrder.create({
        data: {
          tenantId: tenant.id,
          outletId: dto.outletId,
          orderNo,
          clientRequestId: dto.clientRequestId,
          status: 'PENDING_PAYMENT',
          fulfillmentType: dto.fulfillmentType,
          customerId: customerRecord.id,
          customerName,
          customerPhone: normalizedPhone,
          customerNotes: dto.customer.notes?.trim() || null,
          subtotal: idrToDecimal(subtotal),
          tax: idrToDecimal(tax),
          shippingFee: idrToDecimal(shippingFee),
          total: idrToDecimal(total),
          paymentMode,
          ...(codSplit
            ? {
                depositAmount: idrToDecimal(codSplit.depositAmount),
                balanceDue: idrToDecimal(codSplit.balanceDue),
              }
            : {}),
          ...(deliveryAddress ? { deliveryAddress } : {}),
          expiresAt,
          midtransOrderId,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: new Decimal(item.quantity),
              unitPrice: idrToDecimal(item.unitPrice),
              subtotal: idrToDecimal(item.lineSubtotal),
            })),
          },
          payments: {
            create: {
              status: 'PENDING',
              amount: idrToDecimal(chargeAmount),
              ...(paymentMode === 'COD' ? { paymentType: 'COD_DEPOSIT' } : {}),
            },
          },
        },
        include: { outlet: true, items: true, payments: true },
      });

      return created;
    });

    const midtransConfig = await this.resolveTenantMidtransConfig(tenant.id);
    const payment = await this.midtrans.createSnapPayment({
      orderId: order.midtransOrderId ?? order.orderNo,
      orderNo: order.orderNo,
      tenantSlug: tenant.slug,
      grossAmount: chargeAmount,
      customerName: order.customerName,
      customerPhone: formatPhoneDisplay(order.customerPhone),
    }, midtransConfig);

    return {
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        paymentMode,
        outlet: {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address ?? '',
        },
        customer: {
          name: order.customerName,
          phone: formatPhoneDisplay(order.customerPhone),
        },
        subtotal,
        tax,
        shippingFee,
        total,
        depositAmount: codSplit?.depositAmount ?? null,
        balanceDue: codSplit?.balanceDue ?? null,
        expiresAt: order.expiresAt?.toISOString() ?? null,
      },
      payment,
    };
  }

  private buildCreateOrderResponse(
    order: {
      id: string;
      orderNo: string;
      status: string;
      fulfillmentType: string;
      paymentMode?: string;
      customerName: string;
      customerPhone: string;
      subtotal: Decimal;
      tax: Decimal;
      shippingFee: Decimal;
      total: Decimal;
      depositAmount?: Decimal | null;
      balanceDue?: Decimal | null;
      expiresAt: Date | null;
      midtransOrderId: string | null;
      outlet: { id: string; name: string; address: string | null };
    },
    _slug: string,
    payment: { snapToken: string; redirectUrl: string },
  ) {
    const total = toIdrInteger(order.total);
    const paymentMode = (order.paymentMode ?? 'FULL_ONLINE') as 'FULL_ONLINE' | 'COD';
    const depositAmount =
      order.depositAmount != null ? toIdrInteger(order.depositAmount) : paymentMode === 'COD' ? calculateOnlineCodSplit(total).depositAmount : null;
    const balanceDue =
      order.balanceDue != null ? toIdrInteger(order.balanceDue) : paymentMode === 'COD' ? calculateOnlineCodSplit(total).balanceDue : null;
    return {
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
        paymentMode,
        outlet: {
          id: order.outlet.id,
          name: order.outlet.name,
          address: order.outlet.address ?? '',
        },
        customer: {
          name: order.customerName,
          phone: formatPhoneDisplay(order.customerPhone),
        },
        subtotal: toIdrInteger(order.subtotal),
        tax: toIdrInteger(order.tax),
        shippingFee: toIdrInteger(order.shippingFee),
        total,
        depositAmount,
        balanceDue,
        expiresAt: order.expiresAt?.toISOString() ?? null,
      },
      payment,
    };
  }

  async getOrderStatus(tenantSlug: string, orderNo: string, phone: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const normalizedPhone = normalizePhone(phone);
    const order = await this.prisma.onlineOrder.findFirst({
      where: { tenantId: tenant.id, orderNo },
      include: { outlet: true },
    });
    if (!order || order.customerPhone !== normalizedPhone) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }

    let status = order.status;
    if (
      ['NEW', 'PENDING_PAYMENT'].includes(order.status) &&
      order.expiresAt != null &&
      order.expiresAt <= new Date()
    ) {
      await this.prisma.onlineOrder.update({
        where: { id: order.id },
        data: {
          status: 'EXPIRED' as never,
          cancelledAt: new Date(),
          cancelReason: 'Pesanan kedaluwarsa — TTL pembayaran habis.',
        },
      });
      status = 'EXPIRED' as typeof order.status;
    }

    const canRetryPayment =
      ['NEW', 'PENDING_PAYMENT'].includes(status) &&
      order.expiresAt != null &&
      order.expiresAt > new Date();

    return {
      orderNo: order.orderNo,
      status,
      statusLabel: orderStatusLabel(status),
      fulfillmentType: order.fulfillmentType,
      outletName: order.outlet.name,
      total: toIdrInteger(order.total),
      paidAt: order.paidAt?.toISOString() ?? null,
      canRetryPayment,
    };
  }

  async retryPayment(tenantSlug: string, orderNo: string, phone: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const normalizedPhone = normalizePhone(phone);
    const order = await this.prisma.onlineOrder.findFirst({
      where: { tenantId: tenant.id, orderNo },
    });
    if (!order || order.customerPhone !== normalizedPhone) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }
    if (!['NEW', 'PENDING_PAYMENT'].includes(order.status)) {
      throw new ConflictException({
        code: ErrorCodes.ONLINE_PAYMENT_ALREADY_PAID,
        message: 'Pesanan sudah dibayar.',
      });
    }
    if (order.expiresAt && order.expiresAt <= new Date()) {
      throw new ConflictException({
        code: ErrorCodes.ONLINE_ORDER_EXPIRED,
        message: 'Pesanan kedaluwarsa. Silakan buat pesanan baru.',
      });
    }

    const midtransConfig = await this.resolveTenantMidtransConfig(tenant.id);
    const chargeAmount = resolveOnlineOrderChargeAmount(
      (order as { paymentMode?: 'FULL_ONLINE' | 'COD' }).paymentMode ?? 'FULL_ONLINE',
      toIdrInteger(order.total),
      order.depositAmount != null ? toIdrInteger(order.depositAmount) : null,
    );
    const payment = await this.midtrans.createSnapPayment({
      orderId: order.midtransOrderId ?? order.orderNo,
      orderNo: order.orderNo,
      tenantSlug: tenant.slug,
      grossAmount: chargeAmount,
      customerName: order.customerName,
      customerPhone: formatPhoneDisplay(order.customerPhone),
    }, midtransConfig);

    return { payment };
  }

  async confirmMockPayment(tenantSlug: string, orderNo: string, phone: string) {
    if (!this.midtrans.isMockMode()) {
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Konfirmasi mock hanya tersedia saat Midtrans mock mode.',
      });
    }

    const tenant = await this.resolveTenant(tenantSlug);
    const normalizedPhone = normalizePhone(phone);
    const order = await this.prisma.onlineOrder.findFirst({
      where: { tenantId: tenant.id, orderNo },
    });
    if (!order || order.customerPhone !== normalizedPhone) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_ORDER_NOT_FOUND,
        message: 'Pesanan tidak ditemukan.',
      });
    }
    if (!['NEW', 'PENDING_PAYMENT'].includes(order.status)) {
      return { ok: true, message: 'Already paid' };
    }

    const grossAmount = toIdrInteger(order.total);
    const result = await this.onlineOrdersService.handleMidtransWebhook({
      order_id: order.midtransOrderId ?? order.orderNo,
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: `${grossAmount}.00`,
      transaction_id: `mock-${order.orderNo}`,
      payment_type: 'mock',
    });

    return {
      ok: true,
      message: result.message,
      status: 'PAID',
      statusLabel: orderStatusLabel('PAID'),
    };
  }

  private async assertOutletBelongsToTenant(
    tenantId: string,
    outletId: string,
    settings?: StorefrontSettings,
  ) {
    const outlet = await this.prisma.outlet.findFirst({
      where: { id: outletId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!outlet) {
      throw new NotFoundException({
        code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
        message: 'Toko tidak ditemukan.',
      });
    }
    if (settings && settings.branches.enabledOutletIds.length > 0) {
      if (!settings.branches.enabledOutletIds.includes(outletId)) {
        throw new NotFoundException({
          code: ErrorCodes.ONLINE_STORE_NOT_FOUND,
          message: 'Cabang tidak tersedia di storefront.',
        });
      }
    }
  }

  async registerMember(
    tenantSlug: string,
    dto: { name: string; phone: string; email?: string },
  ) {
    return this.customersService.registerPublic(tenantSlug, dto);
  }
}
