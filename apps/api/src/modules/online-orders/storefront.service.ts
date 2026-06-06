import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { ErrorCodes, ONLINE_DELIVERY_FLAT_FEE, TAX_RATE } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import type { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import type { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';
import { MidtransService, type MidtransRuntimeConfig } from './midtrans.service';
import { OnlineOrdersService } from './online-orders.service';
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

  async listOutlets(tenantSlug: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    const outlets = await this.prisma.outlet.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: { id: true, name: true, code: true, address: true },
      orderBy: { name: 'asc' },
    });
    return {
      outlets: outlets.map((outlet) => ({
        ...outlet,
        address: outlet.address ?? '',
        pickupHoursLabel: 'Senin–Sabtu 08:00–17:00',
      })),
    };
  }

  async listCategories(tenantSlug: string, outletId: string) {
    const tenant = await this.resolveTenant(tenantSlug);
    await this.assertOutletBelongsToTenant(tenant.id, outletId);

    const categories = await this.prisma.category.findMany({
      where: {
        tenantId: tenant.id,
        products: {
          some: {
            sellOnline: true,
            isActive: true,
            hasVariants: false,
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
    await this.assertOutletBelongsToTenant(tenant.id, query.outletId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

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

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
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
            where: { isActive: true, sellOnline: true },
            select: { id: true, price: true },
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
      items: products.map((product) => {
        const displayPrice =
          product.hasVariants && product.variants[0]
            ? toIdrInteger(product.variants[0].price)
            : toIdrInteger(product.price);
        const qty = product.hasVariants
          ? product.variants.reduce((sum, variant) => sum + (stockMap.get(variant.id) ?? 0), 0)
          : stockMap.get(product.id) ?? 0;
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
          ...(product.hasVariants ? { fromPrice: displayPrice } : {}),
          cacheHint: { asOf, ttlSeconds: CACHE_TTL_SECONDS },
        };
      }),
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
    await this.assertOutletBelongsToTenant(tenant.id, outletId);

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
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
        unit: { select: { symbol: true } },
        variants: {
          where: { isActive: true, sellOnline: true },
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
      cacheHint: { asOf, ttlSeconds: CACHE_TTL_SECONDS },
    };
  }

  async createOrder(tenantSlug: string, dto: CreateOnlineOrderDto) {
    if (dto.website?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Permintaan checkout tidak dapat diproses.',
      });
    }

    const tenant = await this.resolveTenant(tenantSlug);
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
      return this.buildCreateOrderResponse(existing, tenant.slug, await this.midtrans.createSnapPayment({
        orderId: existing.midtransOrderId ?? existing.orderNo,
        orderNo: existing.orderNo,
        tenantSlug: tenant.slug,
        grossAmount: toIdrInteger(existing.total),
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
        sellOnline: true,
        isActive: true,
        hasVariants: false,
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
    const deliveryAddress =
      dto.fulfillmentType === 'DELIVERY' && dto.deliveryAddress
        ? {
            street: dto.deliveryAddress.street.trim(),
            district: dto.deliveryAddress.district.trim(),
            city: dto.deliveryAddress.city.trim(),
            ...(dto.deliveryAddress.postalCode?.trim()
              ? { postalCode: dto.deliveryAddress.postalCode.trim() }
              : {}),
          }
        : null;
    const expiresAt = paymentExpiresAt();
    const dateKey = getJakartaDateKey();
    const normalizedPhone = normalizePhone(dto.customer.phone);

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
          customerName: dto.customer.name.trim(),
          customerPhone: normalizedPhone,
          customerNotes: dto.customer.notes?.trim() || null,
          subtotal: idrToDecimal(subtotal),
          tax: idrToDecimal(tax),
          shippingFee: idrToDecimal(shippingFee),
          total: idrToDecimal(total),
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
              amount: idrToDecimal(total),
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
      grossAmount: total,
      customerName: order.customerName,
      customerPhone: formatPhoneDisplay(order.customerPhone),
    }, midtransConfig);

    return {
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
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
      customerName: string;
      customerPhone: string;
      subtotal: Decimal;
      tax: Decimal;
      shippingFee: Decimal;
      total: Decimal;
      expiresAt: Date | null;
      midtransOrderId: string | null;
      outlet: { id: string; name: string; address: string | null };
    },
    _slug: string,
    payment: { snapToken: string; redirectUrl: string },
  ) {
    const total = toIdrInteger(order.total);
    return {
      order: {
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        fulfillmentType: order.fulfillmentType,
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
    const payment = await this.midtrans.createSnapPayment({
      orderId: order.midtransOrderId ?? order.orderNo,
      orderNo: order.orderNo,
      tenantSlug: tenant.slug,
      grossAmount: toIdrInteger(order.total),
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

  private async assertOutletBelongsToTenant(tenantId: string, outletId: string) {
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
  }
}
