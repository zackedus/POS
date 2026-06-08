import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { ErrorCodes, PaymentMethod, computeCreditDueDate, computePosTax, isValidCreditTermsDays } from '@barokah/shared';
import {
  buildInsufficientStockDetail,
  convertToBaseQuantity,
  derivePurchaseCostFromBaseCost,
  formatInsufficientStockMessage,
  isValidSellQuantity,
  mapPrismaUnitConversions,
  resolveSellUnitPrice,
  roundQty,
  type InsufficientStockContext,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { assertOutletAccess as enforceOutletAccess, resolveOutletId } from '../../common/utils/outlet.util';
import { resolveReportDayRange } from '../../common/utils/report-date.util';
import type { AuthJwtPayload } from '../auth/auth.types';
import { PromoService } from '../promo/promo.service';
import { CustomersService } from '../customers/customers.service';
import { FinanceCheckoutService } from '../finance/finance-checkout.service';
import { CreditLimitService } from '../finance/credit-limit.service';
import { DeliveriesService } from '../deliveries/deliveries.service';
import type { CheckoutDeliveryFields } from './dto/checkout-delivery.dto';
import type { PromoCartLine } from '@barokah/shared';
import { CheckoutCashDto } from './dto/checkout-cash.dto';
import { CheckoutSplitDto } from './dto/checkout-split.dto';
import { HoldTransactionDto } from './dto/hold-transaction.dto';
import { ListHeldTransactionsDto } from './dto/list-held-transactions.dto';
import { ListRecentTransactionsDto } from './dto/list-recent-transactions.dto';
import { RefundTransactionDto } from './dto/refund-transaction.dto';
import { VoidTransactionDto } from './dto/void-transaction.dto';
import { buildEscPosStub, type DigitalReceiptPayload } from './receipt.util';
import { ValidateCartDto } from './dto/validate-cart.dto';
import {
  computeBundleEffectiveCost,
  detectNegativeMargin,
  type MarginWarningItem,
} from '../../common/utils/margin.util';

type ProductRow = {
  id: string;
  name: string;
  price: Decimal;
  costPrice: Decimal;
  categoryId: string | null;
  hasVariants: boolean;
  unitId: string | null;
  moq: Decimal;
  orderStep: Decimal;
  unit: { id: string; symbol: string; name: string } | null;
  unitConversions: Array<{
    sellUnitId: string;
    conversionToBase: Decimal;
    isPurchaseUnit: boolean;
    isSellUnit: boolean;
    sellStep: Decimal | null;
    minQty: Decimal | null;
    sellUnit: { id: string; symbol: string; name: string };
  }>;
  bundleDefinition?: {
    id: string;
    isActive: boolean;
    items: Array<{
      componentProductId: string;
      quantity: Decimal;
      componentProduct: { id: string; name: string; costPrice: Decimal };
    }>;
    outletPolicies: Array<{
      outletId: string;
      isActive: boolean;
    }>;
  } | null;
};

type CheckoutCartItem = {
  productId: string;
  quantity: number;
  sellUnitId?: string;
};

type NormalizedCartItem = {
  productId: string;
  productName: string;
  quantity: number;
  sellUnitId?: string;
  sellUnitSymbol?: string;
  baseQuantity: number;
  unitPrice: number;
  lineSubtotal: number;
  availableBefore: number;
};

type StockDeductionItem = {
  productId: string;
  productName: string;
  quantity: number;
  availableBefore: number;
  notes: string;
};

const HOLD_TTL_MINUTES = 120;
const SPLIT_ALLOWED_METHODS = new Set<PaymentMethod>([
  PaymentMethod.CASH,
  PaymentMethod.TRANSFER,
  PaymentMethod.QRIS,
  PaymentMethod.E_WALLET,
  PaymentMethod.CARD,
  PaymentMethod.CREDIT,
  PaymentMethod.DEPOSIT,
]);
const TX_RETRY_ATTEMPTS = 2;
const GATEWAY_ERROR_PREFIX = 'GW_';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promoService: PromoService,
    private readonly customersService: CustomersService,
    private readonly financeCheckout: FinanceCheckoutService,
    private readonly creditLimitService: CreditLimitService,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  private isPrismaError(error: unknown, code: string): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }
    return 'code' in error && (error as { code?: string }).code === code;
  }

  private async getTenantTaxConfig(tenantId: string): Promise<{
    ppnEnabled: boolean;
    ppnRatePercent: number;
  }> {
    const row = await this.prisma.tenantSettings.findUnique({ where: { tenantId } });
    return {
      ppnEnabled: row?.ppnEnabled ?? false,
      ppnRatePercent: row ? Number(row.ppnRatePercent) : 11,
    };
  }

  private async getTenantDefaultCreditTermsDays(tenantId: string): Promise<number> {
    const row = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { defaultCreditTermsDays: true },
    });
    const days = row?.defaultCreditTermsDays ?? 30;
    return isValidCreditTermsDays(days) ? days : 30;
  }

  private async resolveCreditDueDate(
    tenantId: string,
    creditTermsDays: number | undefined,
    hasCreditPayment: boolean,
  ): Promise<string | null> {
    if (!hasCreditPayment) {
      return null;
    }
    const terms =
      creditTermsDays != null && isValidCreditTermsDays(creditTermsDays)
        ? creditTermsDays
        : await this.getTenantDefaultCreditTermsDays(tenantId);
    return computeCreditDueDate(terms);
  }

  private async runWithRetry<T>(work: () => Promise<T>): Promise<T> {
    let latestError: unknown;
    for (let attempt = 0; attempt <= TX_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await work();
      } catch (error) {
        latestError = error;
        if (!this.isPrismaError(error, 'P2034') || attempt === TX_RETRY_ATTEMPTS) {
          break;
        }
      }
    }

    throw latestError;
  }

  private assertLinkedCustomerForFinancePayments(
    payments: CheckoutSplitDto['payments'],
    customerId?: string | null,
  ) {
    const hasCredit = payments.some((p) => p.method === PaymentMethod.CREDIT && p.amount > 0);
    const hasDeposit = payments.some((p) => p.method === PaymentMethod.DEPOSIT && p.amount > 0);
    if (hasCredit && !customerId?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.CUSTOMER_REQUIRED_FOR_CREDIT,
        message: 'Pilih pelanggan terlebih dahulu untuk bayar tempo.',
      });
    }
    if (hasDeposit && !customerId?.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.CUSTOMER_REQUIRED_FOR_DEPOSIT,
        message: 'Pilih pelanggan terlebih dahulu untuk bayar deposit.',
      });
    }
  }

  private assertValidSplitPayments(payments: CheckoutSplitDto['payments'], subtotal: number) {
    if (payments.length < 1 || payments.length > 3) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Pembayaran wajib berisi 1 sampai 3 metode.',
      });
    }

    const seenMethods = new Set<PaymentMethod>();
    for (const payment of payments) {
      if (!SPLIT_ALLOWED_METHODS.has(payment.method)) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: `Metode pembayaran "${payment.method}" belum didukung untuk split payment.`,
        });
      }
      if (seenMethods.has(payment.method)) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: `Split payment tidak valid. Metode "${payment.method}" tidak boleh duplikat.`,
        });
      }
      seenMethods.add(payment.method);

      if (payment.amount <= 0) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: `Nominal pembayaran ${payment.method} harus lebih dari 0.`,
        });
      }
      this.assertGatewayResultForPayment(payment.method, payment.reference);
    }

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (totalPaid !== subtotal) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Total pembayaran split harus sama dengan total transaksi.',
      });
    }
  }

  private assertGatewayResultForPayment(method: PaymentMethod, reference?: string) {
    if (method === PaymentMethod.CASH || !reference?.trim()) {
      return;
    }

    const normalized = reference.trim().toUpperCase();
    if (!normalized.startsWith(GATEWAY_ERROR_PREFIX)) {
      return;
    }

    if (normalized === 'GW_TIMEOUT') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.PAYMENT_TIMEOUT,
        message: `Pembayaran ${method} timeout di gateway. Coba ulang metode pembayaran.`,
      });
    }

    if (normalized === 'GW_UNAVAILABLE') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE,
        message: `Gateway pembayaran ${method} sedang tidak tersedia.`,
      });
    }

    throw new UnprocessableEntityException({
      code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      message: `Gateway menolak pembayaran ${method}.`,
    });
  }

  private resolveBundleForOutlet(product: ProductRow, outletId: string): ProductRow['bundleDefinition'] {
    const bundle = product.bundleDefinition;
    if (!bundle) {
      return null;
    }
    const outletPolicy = bundle.outletPolicies.find((policy) => policy.outletId === outletId);
    if (!outletPolicy) {
      return bundle;
    }
    return {
      ...bundle,
      isActive: outletPolicy.isActive,
    };
  }

  private computeMarginWarnings(
    productMap: Map<string, ProductRow>,
    cartItems: CheckoutCartItem[],
    outletId: string,
  ) {
    const warnings: MarginWarningItem[] = [];
    const seen = new Set<string>();

    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (!product?.unitId) {
        continue;
      }

      const sellUnitId = item.sellUnitId ?? product.unitId;
      const dedupeKey = `${item.productId}:${sellUnitId}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);

      const conversions = mapPrismaUnitConversions(product.unitConversions);
      const conversion = conversions.find((row) => row.unitId === sellUnitId);
      const conversionToBase =
        sellUnitId === product.unitId ? 1 : Number(conversion?.conversionToBase ?? 1);
      const sellPrice = resolveSellUnitPrice(
        toIdrInteger(product.price),
        item.quantity,
        sellUnitId,
        product.unitId,
        conversionToBase,
      );

      const bundle = this.resolveBundleForOutlet(product, outletId);
      let baseCost = toIdrInteger(product.costPrice);
      if (bundle?.isActive && bundle.items.length > 0) {
        baseCost = computeBundleEffectiveCost(
          baseCost,
          bundle.items.map((component) => ({
            costPrice: toIdrInteger(component.componentProduct.costPrice),
            quantity: Number(component.quantity),
          })),
        );
      }
      const costPrice =
        sellUnitId === product.unitId
          ? baseCost
          : derivePurchaseCostFromBaseCost(baseCost, conversionToBase);

      const warning = detectNegativeMargin({
        productId: item.productId,
        productName: product.name,
        sellPrice,
        costPrice,
      });
      if (warning) {
        warnings.push(warning);
      }
    }
    return warnings;
  }

  async validateCart(user: AuthJwtPayload, dto: ValidateCartDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    const mergedItems = dto.items.reduce<Map<string, CheckoutCartItem>>((acc, item) => {
      const key = `${item.productId}:${item.sellUnitId ?? 'base'}`;
      const existing = acc.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        acc.set(key, { ...item });
      }
      return acc;
    }, new Map());
    const cartItems = [...mergedItems.values()];
    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        hasVariants: true,
        unitId: true,
        moq: true,
        orderStep: true,
        unit: { select: { id: true, symbol: true, name: true } },
        unitConversions: {
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
            sellUnit: { select: { id: true, symbol: true, name: true } },
          },
        },
        bundleDefinition: {
          select: {
            id: true,
            isActive: true,
            items: {
              select: {
                componentProductId: true,
                quantity: true,
                componentProduct: { select: { id: true, name: true, costPrice: true } },
              },
            },
            outletPolicies: {
              where: { outletId },
              select: { outletId: true, isActive: true },
            },
          },
        },
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product as ProductRow]));
    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Produk tidak ditemukan atau tidak aktif.',
        });
      }

      if ((productMap.get(productId) as ProductRow).hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk induk varian tidak dapat divalidasi. Pilih SKU varian.',
        });
      }
    }
    const marginWarnings = this.computeMarginWarnings(productMap, cartItems, outletId);
    const normalizedLines = cartItems.map((item) =>
      this.resolveCartLine(productMap.get(item.productId)! as ProductRow, item),
    );
    const stockIssues = await this.collectStockIssues(outletId, normalizedLines, productMap);
    return {
      hasNegativeMargin: marginWarnings.length > 0,
      marginWarnings,
      stockIssues,
      hasInsufficientStock: stockIssues.length > 0,
    };
  }

  private buildCheckoutResponse(
    transaction: {
      id: string;
      receiptNo: string;
      outletId: string;
      shiftId: string | null;
      cashierId: string;
      subtotal: Decimal;
      total: Decimal;
      tax?: Decimal;
      discount?: Decimal;
      completedAt: Date | null;
    },
    itemCount: number,
    paymentSummary?: Record<string, number>,
    cashReceived?: number,
    marginWarnings?: MarginWarningItem[],
    loyalty?: {
      pointsEarned?: number;
      customerPoints?: number;
      pointsRedeemed?: number;
      loyaltyDiscount?: number;
    },
    delivery?: { deliveryNo?: string; deliveryError?: string },
  ) {
    return {
      id: transaction.id,
      receiptNo: transaction.receiptNo,
      outletId: transaction.outletId,
      shiftId: transaction.shiftId,
      cashierId: transaction.cashierId,
      subtotal: toIdrInteger(transaction.subtotal),
      total: toIdrInteger(transaction.total),
      ...(transaction.tax != null ? { tax: toIdrInteger(transaction.tax as Decimal) } : { tax: 0 }),
      ...(typeof cashReceived === 'number'
        ? { cashReceived, change: cashReceived - toIdrInteger(transaction.total) }
        : {}),
      ...(paymentSummary ? { payments: paymentSummary } : {}),
      itemCount,
      completedAt: transaction.completedAt,
      ...(marginWarnings && marginWarnings.length > 0
        ? { hasNegativeMargin: true, marginWarnings }
        : { hasNegativeMargin: false }),
      ...(transaction.discount != null
        ? { discount: toIdrInteger(transaction.discount as Decimal) }
        : {}),
      ...(loyalty?.pointsEarned != null && loyalty.pointsEarned > 0
        ? { pointsEarned: loyalty.pointsEarned, customerPoints: loyalty.customerPoints }
        : {}),
      ...(loyalty?.pointsRedeemed != null && loyalty.pointsRedeemed > 0
        ? {
            pointsRedeemed: loyalty.pointsRedeemed,
            loyaltyDiscount: loyalty.loyaltyDiscount ?? 0,
          }
        : {}),
      ...(delivery?.deliveryNo ? { deliveryNo: delivery.deliveryNo } : {}),
      ...(delivery?.deliveryError ? { deliveryError: delivery.deliveryError } : {}),
    };
  }

  private async applyCheckoutDelivery(
    user: AuthJwtPayload,
    transactionId: string,
    outletId: string,
    customerId: string | null,
    dto: Pick<
      CheckoutDeliveryFields,
      | 'deliveryRequired'
      | 'deliveryAddressId'
      | 'deliveryAddressSnapshot'
      | 'deliveryNotes'
      | 'customerName'
      | 'customerPhone'
    >,
  ): Promise<{ deliveryNo?: string; deliveryError?: string }> {
    const result = await this.deliveriesService.createForCompletedTransaction(user, {
      transactionId,
      outletId,
      customerId,
      delivery: dto,
    });
    if (!result) {
      return {};
    }
    if ('deliveryNo' in result) {
      return { deliveryNo: result.deliveryNo };
    }
    return { deliveryError: result.error };
  }

  private buildPromoCartLines(
    normalizedItems: Array<{ productId: string; lineSubtotal: number }>,
    productMap: Map<string, { categoryId?: string | null }>,
  ): PromoCartLine[] {
    return normalizedItems.map((item) => ({
      productId: item.productId,
      categoryId: productMap.get(item.productId)?.categoryId ?? null,
      lineSubtotal: item.lineSubtotal,
    }));
  }

  private async findExistingTransactionByRequest(
    outletId: string,
    clientRequestId?: string,
  ): Promise<{
    id: string;
    receiptNo: string;
    outletId: string;
    shiftId: string | null;
    cashierId: string;
    subtotal: Decimal;
    total: Decimal;
    completedAt: Date | null;
    items: Array<{ id: string }>;
    payments: Array<{ method: string; amount: Decimal }>;
  } | null> {
    if (!clientRequestId?.trim()) {
      return null;
    }
    return this.prisma.transaction.findFirst({
      where: { outletId, clientRequestId: clientRequestId.trim() },
      select: {
        id: true,
        receiptNo: true,
        outletId: true,
        shiftId: true,
        cashierId: true,
        subtotal: true,
        total: true,
        completedAt: true,
        items: { select: { id: true } },
        payments: { select: { method: true, amount: true } },
      },
    });
  }

  /** Public wrapper for QRIS idempotency checks. */
  async findExistingTransactionByRequestPublic(outletId: string, clientRequestId?: string) {
    const existing = await this.findExistingTransactionByRequest(outletId, clientRequestId);
    if (!existing) {
      return null;
    }
    return {
      id: existing.id,
      receiptNo: existing.receiptNo,
      total: toIdrInteger(existing.total),
    };
  }

  /** Preview checkout total (subtotal − promo + PPN) without persisting. */
  async previewCheckoutTotal(
    user: AuthJwtPayload,
    input: {
      outletId: string;
      items: CheckoutCartItem[];
      promoRuleId?: string;
    },
  ): Promise<{ subtotal: number; discount: number; tax: number; total: number }> {
    const { normalizedItems, subtotal, productMap } = await this.resolveActiveShiftAndCart(
      user,
      input.outletId,
      input.items,
    );
    const promoLines = this.buildPromoCartLines(normalizedItems, productMap);
    const promo = await this.promoService.resolveCheckoutDiscount(user, input.promoRuleId, promoLines);
    const discount = promo.discountAmount;
    const taxConfig = await this.getTenantTaxConfig(user.tenantId);
    const { tax, total } = computePosTax({
      subtotal,
      discount,
      ...taxConfig,
    });
    return { subtotal, discount, tax, total };
  }

  private async findExistingHeldByRequest(
    outletId: string,
    clientRequestId?: string,
  ): Promise<{
    id: string;
    label: string | null;
    total: Decimal;
    expiresAt: Date;
    items: Array<{
      productId: string;
      productName: string;
      unitPrice: Decimal;
      quantity: Decimal;
    }>;
  } | null> {
    const trimmed = clientRequestId?.trim();
    if (!trimmed) {
      return null;
    }

    const held = await this.prisma.heldTransaction.findFirst({
      where: {
        outletId,
        clientRequestId: trimmed,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        label: true,
        total: true,
        expiresAt: true,
        items: {
          select: {
            productId: true,
            productName: true,
            unitPrice: true,
            quantity: true,
            sellUnitId: true,
            sellUnitSymbol: true,
          },
        },
      },
    });

    return held;
  }

  private mapHoldResponse(
    held: {
      id: string;
      label: string | null;
      total: Decimal;
      expiresAt: Date;
      items: Array<{
        productId: string;
        productName: string;
        unitPrice: Decimal;
        quantity: Decimal;
        sellUnitId?: string | null;
        sellUnitSymbol?: string | null;
      }>;
    },
    idempotentReplay: boolean,
  ) {
    return {
      id: held.id,
      label: held.label,
      total: toIdrInteger(held.total),
      expiresAt: held.expiresAt,
      itemCount: held.items.length,
      items: held.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: toIdrInteger(item.unitPrice),
        quantity: Number(item.quantity),
        ...(item.sellUnitId ? { sellUnitId: item.sellUnitId } : {}),
        ...(item.sellUnitSymbol ? { unitSymbol: item.sellUnitSymbol } : {}),
      })),
      idempotentReplay,
    };
  }

  private buildStockNeedsMap(
    normalizedLines: NormalizedCartItem[],
    productMap: Map<string, ProductRow>,
    outletId: string,
  ): Map<string, StockDeductionItem> {
    const stockNeeds = new Map<string, StockDeductionItem>();
    for (const line of normalizedLines) {
      const product = productMap.get(line.productId)! as ProductRow;
      const bundle = this.resolveBundleForOutlet(product, outletId);
      if (bundle?.isActive && bundle.items.length > 0) {
        for (const component of bundle.items) {
          const existing = stockNeeds.get(component.componentProductId);
          const required = line.baseQuantity * Number(component.quantity);
          stockNeeds.set(component.componentProductId, {
            productId: component.componentProductId,
            productName: component.componentProduct.name,
            quantity: roundQty((existing?.quantity ?? 0) + required),
            availableBefore: 0,
            notes: `Bundle component from ${product.name}`,
          });
        }
      } else {
        const existing = stockNeeds.get(line.productId);
        stockNeeds.set(line.productId, {
          productId: line.productId,
          productName: line.productName,
          quantity: roundQty((existing?.quantity ?? 0) + line.baseQuantity),
          availableBefore: 0,
          notes: 'Direct SKU sale',
        });
      }
    }
    return stockNeeds;
  }

  private resolveStockMessageContext(
    stock: StockDeductionItem,
    normalizedLines: NormalizedCartItem[],
    productMap: Map<string, ProductRow>,
  ): InsufficientStockContext {
    const matchingLine = normalizedLines.find((line) => line.productId === stock.productId);
    const product = productMap.get(stock.productId);
    const baseUnitSymbol = product?.unit?.symbol ?? 'unit';

    let sellQty: number | undefined;
    let sellUnitSymbol: string | undefined;
    let conversionToBase: number | undefined;

    if (matchingLine) {
      if (matchingLine.sellUnitId && product) {
        const conversion = product.unitConversions.find(
          (row) => row.sellUnitId === matchingLine.sellUnitId,
        );
        if (conversion) {
          conversionToBase = Number(conversion.conversionToBase);
          sellQty = matchingLine.quantity;
          sellUnitSymbol = matchingLine.sellUnitSymbol;
        }
      } else {
        sellQty = matchingLine.quantity;
        sellUnitSymbol = baseUnitSymbol;
      }
    }

    return {
      productId: stock.productId,
      productName: stock.productName,
      availableBaseQty: stock.availableBefore,
      requestedBaseQty: stock.quantity,
      baseUnitSymbol,
      sellQty,
      sellUnitSymbol,
      conversionToBase,
    };
  }

  private throwInsufficientStock(
    stock: StockDeductionItem,
    normalizedLines: NormalizedCartItem[],
    productMap: Map<string, ProductRow>,
  ): never {
    const ctx = this.resolveStockMessageContext(stock, normalizedLines, productMap);
    const detail = buildInsufficientStockDetail(ctx);
    throw new ConflictException({
      code: ErrorCodes.INSUFFICIENT_STOCK,
      message: detail.message,
      details: [detail],
    });
  }

  private async collectStockIssues(
    outletId: string,
    normalizedLines: NormalizedCartItem[],
    productMap: Map<string, ProductRow>,
  ) {
    const stockNeeds = this.buildStockNeedsMap(normalizedLines, productMap, outletId);
    if (stockNeeds.size === 0) {
      return [] as Array<{ productId: string; productName: string; message: string }>;
    }

    const inventory = await this.prisma.inventoryItem.findMany({
      where: {
        outletId,
        productId: { in: [...stockNeeds.keys()] },
      },
      select: { productId: true, quantity: true },
    });
    const inventoryMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    const stockDeductions = [...stockNeeds.values()].map((item) => ({
      ...item,
      availableBefore: inventoryMap.get(item.productId) ?? 0,
    }));

    return stockDeductions
      .filter((stock) => stock.availableBefore < stock.quantity)
      .map((stock) => {
        const ctx = this.resolveStockMessageContext(stock, normalizedLines, productMap);
        return {
          productId: stock.productId,
          productName: stock.productName,
          message: formatInsufficientStockMessage(ctx),
        };
      });
  }

  private resolveCartLine(
    product: ProductRow,
    item: CheckoutCartItem,
  ): NormalizedCartItem {
    if (!product.unitId) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: `Produk "${product.name}" belum memiliki satuan dasar.`,
      });
    }

    const conversions = mapPrismaUnitConversions(product.unitConversions);
    const sellUnitId = item.sellUnitId ?? product.unitId;
    const moq = Number(product.moq);
    const orderStep = Number(product.orderStep);

    if (sellUnitId !== product.unitId) {
      const sellConversion = conversions.find((row) => row.unitId === sellUnitId);
      if (!sellConversion?.isSellUnit) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: `Satuan jual "${sellUnitId}" tidak valid untuk "${product.name}".`,
        });
      }
    }

    if (
      !isValidSellQuantity(item.quantity, sellUnitId, product.unitId, moq, orderStep, conversions)
    ) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: `Kuantitas jual tidak valid untuk "${product.name}". Periksa kelipatan satuan.`,
      });
    }

    const baseQuantity = convertToBaseQuantity(
      item.quantity,
      sellUnitId,
      product.unitId,
      conversions,
    );
    const basePrice = toIdrInteger(product.price);
    const lineSubtotal = Math.round(basePrice * baseQuantity);
    const unitPrice =
      item.quantity > 0 ? Math.round(lineSubtotal / item.quantity) : basePrice;
    const sellUnit =
      sellUnitId === product.unitId
        ? product.unit
        : product.unitConversions.find((row) => row.sellUnitId === sellUnitId)?.sellUnit ?? product.unit;

    return {
      productId: product.id,
      productName: product.name,
      quantity: roundQty(item.quantity),
      sellUnitId: sellUnitId === product.unitId ? undefined : sellUnitId,
      sellUnitSymbol: sellUnit?.symbol,
      baseQuantity,
      unitPrice,
      lineSubtotal,
      availableBefore: 0,
    };
  }

  private async resolveActiveShiftAndCart(
    user: AuthJwtPayload,
    outletId: string,
    items: CheckoutCartItem[],
  ) {
    const activeShift = await this.prisma.shift.findFirst({
      where: {
        outletId,
        cashierId: user.sub,
        closedAt: null,
      },
      orderBy: { openedAt: 'desc' },
    });

    if (!activeShift) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.SHIFT_NOT_OPEN,
        message: 'Shift belum dibuka. Buka shift terlebih dahulu.',
      });
    }

    const productIds = [...new Set(items.map((item) => item.productId))];

    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        price: true,
        costPrice: true,
        categoryId: true,
        hasVariants: true,
        unitId: true,
        moq: true,
        orderStep: true,
        unit: { select: { id: true, symbol: true, name: true } },
        unitConversions: {
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
            sellUnit: { select: { id: true, symbol: true, name: true } },
          },
        },
        bundleDefinition: {
          select: {
            id: true,
            isActive: true,
            items: {
              select: {
                componentProductId: true,
                quantity: true,
                componentProduct: { select: { id: true, name: true, costPrice: true } },
              },
            },
            outletPolicies: {
              where: { outletId },
              select: {
                outletId: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product as ProductRow]));

    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Produk tidak ditemukan atau tidak aktif.',
        });
      }

      if ((productMap.get(productId) as ProductRow).hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk induk varian tidak dapat dijual langsung. Pilih SKU varian.',
        });
      }
    }

    const normalizedLines: NormalizedCartItem[] = [];
    for (const item of items) {
      const product = productMap.get(item.productId)! as ProductRow;
      normalizedLines.push(this.resolveCartLine(product, item));
    }

    const stockNeeds = this.buildStockNeedsMap(normalizedLines, productMap, outletId);

    const inventory = await this.prisma.inventoryItem.findMany({
      where: {
        outletId,
        productId: { in: [...stockNeeds.keys()] },
      },
      select: { productId: true, quantity: true },
    });
    const inventoryMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    let subtotal = 0;
    const normalizedItems: NormalizedCartItem[] = normalizedLines.map((line) => {
      subtotal += line.lineSubtotal;
      return line;
    });

    const stockDeductions = [...stockNeeds.values()].map((item) => ({
      ...item,
      availableBefore: inventoryMap.get(item.productId) ?? 0,
    }));

    for (const stock of stockDeductions) {
      if (stock.availableBefore < stock.quantity) {
        this.throwInsufficientStock(stock, normalizedLines, productMap);
      }
    }

    return { activeShift, normalizedItems, subtotal, stockDeductions, productMap, productIds };
  }

  async holdTransaction(user: AuthJwtPayload, dto: HoldTransactionDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    const existing = await this.findExistingHeldByRequest(outletId, dto.clientRequestId);
    if (existing) {
      return this.mapHoldResponse(existing, true);
    }

    const mergedItems = dto.items.reduce<Map<string, CheckoutCartItem>>((acc, item) => {
      const key = `${item.productId}:${item.sellUnitId ?? 'base'}`;
      const existing = acc.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        acc.set(key, { ...item });
      }
      return acc;
    }, new Map());
    const cartItems = [...mergedItems.values()];
    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        isActive: true,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        price: true,
        hasVariants: true,
        unitId: true,
        moq: true,
        orderStep: true,
        unit: { select: { id: true, symbol: true, name: true } },
        unitConversions: {
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
            sellUnit: { select: { id: true, symbol: true, name: true } },
          },
        },
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    for (const productId of productIds) {
      if (!productMap.has(productId)) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Produk tidak ditemukan atau tidak aktif.',
        });
      }

      if ((productMap.get(productId) as { hasVariants: boolean }).hasVariants) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.INVALID_INPUT,
          message: 'Produk induk varian tidak dapat di-hold. Pilih SKU varian.',
        });
      }
    }

    let subtotal = 0;
    const normalizedItems = cartItems.map((item) => {
      const product = productMap.get(item.productId)! as ProductRow;
      const line = this.resolveCartLine(product, item);
      subtotal += line.lineSubtotal;
      return line;
    });

    const expiresAt = new Date(Date.now() + HOLD_TTL_MINUTES * 60 * 1000);
    const clientRequestId = dto.clientRequestId?.trim() || null;

    try {
      const held = await this.prisma.heldTransaction.create({
        data: {
          outletId,
          cashierId: user.sub,
          clientRequestId,
          label: dto.label?.trim() || null,
          subtotal: idrToDecimal(subtotal),
          discount: idrToDecimal(0),
          tax: idrToDecimal(0),
          total: idrToDecimal(subtotal),
          expiresAt,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: new Decimal(item.quantity),
              sellUnitId: item.sellUnitId ?? null,
              sellUnitSymbol: item.sellUnitSymbol ?? null,
              unitPrice: idrToDecimal(item.unitPrice),
              discount: idrToDecimal(0),
              subtotal: idrToDecimal(item.lineSubtotal),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return this.mapHoldResponse(held, false);
    } catch (error) {
      if (clientRequestId && this.isPrismaError(error, 'P2002')) {
        const raced = await this.findExistingHeldByRequest(outletId, clientRequestId);
        if (raced) {
          return this.mapHoldResponse(raced, true);
        }
      }
      throw error;
    }
  }

  async listHeldTransactions(user: AuthJwtPayload, query: ListHeldTransactionsDto) {
    const outletId = resolveOutletId(user, query.outletId);
    const now = new Date();
    const held = await this.prisma.heldTransaction.findMany({
      where: {
        outletId,
        cashierId: user.sub,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 10,
      include: { items: true },
    });

    return held.map((entry) => ({
      id: entry.id,
      label: entry.label,
      total: toIdrInteger(entry.total),
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      itemCount: entry.items.length,
    }));
  }

  async recallHeldTransaction(user: AuthJwtPayload, heldId: string, outletId?: string) {
    const resolvedOutletId = resolveOutletId(user, outletId);
    const held = await this.prisma.heldTransaction.findFirst({
      where: {
        id: heldId,
        outletId: resolvedOutletId,
        cashierId: user.sub,
      },
      include: { items: true },
    });
    if (!held) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Transaksi hold tidak ditemukan.',
      });
    }
    if (held.expiresAt <= new Date()) {
      await this.prisma.heldTransaction.delete({ where: { id: held.id } });
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Transaksi hold sudah kedaluwarsa.',
      });
    }

    const productIds = held.items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        unitId: true,
        unit: { select: { id: true, symbol: true, name: true } },
        unitConversions: {
          select: {
            sellUnitId: true,
            conversionToBase: true,
            isPurchaseUnit: true,
            isSellUnit: true,
            sellStep: true,
            minQty: true,
            sellUnit: { select: { id: true, symbol: true, name: true } },
          },
        },
      },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const inventory = await this.prisma.inventoryItem.findMany({
      where: {
        outletId: resolvedOutletId,
        productId: { in: productIds },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });
    const inventoryMap = new Map(inventory.map((row) => [row.productId, Number(row.quantity)]));

    const stockNeeds = new Map<string, { productName: string; quantity: number }>();
    for (const item of held.items) {
      const product = productMap.get(item.productId);
      const conversions = product?.unitConversions
        ? mapPrismaUnitConversions(product.unitConversions)
        : [];
      const baseQuantity =
        product?.unitId != null
          ? convertToBaseQuantity(
              Number(item.quantity),
              item.sellUnitId ?? product.unitId,
              product.unitId,
              conversions,
            )
          : Number(item.quantity);
      const existing = stockNeeds.get(item.productId);
      stockNeeds.set(item.productId, {
        productName: item.productName,
        quantity: roundQty((existing?.quantity ?? 0) + baseQuantity),
      });
    }

    for (const [productId, need] of stockNeeds) {
      const available = inventoryMap.get(productId) ?? 0;
      if (available < need.quantity) {
        const product = productMap.get(productId);
        const heldItem = held.items.find((item) => item.productId === productId);
        const baseUnitSymbol = product?.unit?.symbol ?? 'unit';
        let conversionToBase: number | undefined;
        if (heldItem?.sellUnitId && product) {
          const conversion = product.unitConversions.find(
            (row) => row.sellUnitId === heldItem.sellUnitId,
          );
          conversionToBase = conversion ? Number(conversion.conversionToBase) : undefined;
        }
        const ctx: InsufficientStockContext = {
          productId,
          productName: need.productName,
          availableBaseQty: available,
          requestedBaseQty: need.quantity,
          baseUnitSymbol,
          sellQty: heldItem ? Number(heldItem.quantity) : undefined,
          sellUnitSymbol: heldItem?.sellUnitSymbol ?? undefined,
          conversionToBase,
        };
        const detail = buildInsufficientStockDetail(ctx);
        throw new ConflictException({
          code: ErrorCodes.INSUFFICIENT_STOCK,
          message: `Recall gagal — ${detail.message}`,
          details: [detail],
        });
      }
    }

    try {
      await this.prisma.heldTransaction.delete({ where: { id: held.id } });
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Transaksi hold sudah direcall pada sesi lain. Muat ulang daftar hold lalu coba lagi.',
        });
      }
      throw error;
    }

    return {
      id: held.id,
      label: held.label,
      total: toIdrInteger(held.total),
      items: held.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: toIdrInteger(item.unitPrice),
        quantity: Number(item.quantity),
        ...(item.sellUnitId ? { sellUnitId: item.sellUnitId } : {}),
        ...(item.sellUnitSymbol ? { unitSymbol: item.sellUnitSymbol } : {}),
      })),
    };
  }

  async checkoutCash(user: AuthJwtPayload, dto: CheckoutCashDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    const existing = await this.findExistingTransactionByRequest(outletId, dto.clientRequestId);
    if (existing) {
      const delivery = await this.applyCheckoutDelivery(
        user,
        existing.id,
        outletId,
        existing.customerId,
        dto,
      );
      return this.buildCheckoutResponse(
        existing,
        existing.items.length,
        undefined,
        dto.cashReceived,
        undefined,
        undefined,
        delivery,
      );
    }

    const { activeShift, normalizedItems, subtotal, stockDeductions, productMap } =
      await this.resolveActiveShiftAndCart(user, outletId, dto.items);
    const marginWarnings = this.computeMarginWarnings(productMap, dto.items, outletId);
    const promoLines = this.buildPromoCartLines(normalizedItems, productMap);
    const promo = await this.promoService.resolveCheckoutDiscount(user, dto.promoRuleId, promoLines);
    const promoDiscount = promo.discountAmount;
    const customerId = await this.customersService.resolveOptionalCustomerId(user.tenantId, dto);
    const loyaltyRedeem = await this.customersService.resolveLoyaltyRedeem({
      tenantId: user.tenantId,
      customerId,
      pointsRequested: dto.loyaltyPointsToRedeem ?? 0,
      netAfterPromoIdr: Math.max(0, subtotal - promoDiscount),
    });
    const discount = promoDiscount + loyaltyRedeem.discountIdr;
    const taxConfig = await this.getTenantTaxConfig(user.tenantId);
    const { tax, total } = computePosTax({
      subtotal,
      discount,
      ...taxConfig,
    });

    if (dto.cashReceived < total) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Nominal tunai kurang dari total transaksi.',
      });
    }

    const receiptNo = `TRX-${Date.now()}`;
    const notes = dto.notes?.trim() || null;
    const promoNote = promo.promoName ? `Promo: ${promo.promoName}` : null;
    const loyaltyNote =
      loyaltyRedeem.pointsRedeemed > 0
        ? `Loyalty: -${loyaltyRedeem.pointsRedeemed} poin (−${loyaltyRedeem.discountIdr} IDR)`
        : null;
    const mergedNotes = [notes, promoNote, loyaltyNote].filter(Boolean).join(' | ') || null;

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          outletId,
          cashierId: user.sub,
          shiftId: activeShift.id,
          customerId,
          receiptNo,
          clientRequestId: dto.clientRequestId?.trim() || null,
          subtotal: idrToDecimal(subtotal),
          discount: idrToDecimal(discount),
          tax: idrToDecimal(tax),
          total: idrToDecimal(total),
          notes: mergedNotes,
          status: 'COMPLETED',
          completedAt: new Date(),
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: new Decimal(item.quantity),
              sellUnitId: item.sellUnitId ?? null,
              sellUnitSymbol: item.sellUnitSymbol ?? null,
              unitPrice: idrToDecimal(item.unitPrice),
              discount: idrToDecimal(0),
              tax: idrToDecimal(0),
              subtotal: idrToDecimal(item.lineSubtotal),
            })),
          },
          payments: {
            create: {
              method: 'CASH',
              amount: idrToDecimal(dto.cashReceived),
            },
          },
        },
      });

      for (const item of stockDeductions) {
        const quantityAfter = item.availableBefore - item.quantity;
        await tx.inventoryItem.upsert({
          where: {
            outletId_productId: {
              outletId,
              productId: item.productId,
            },
          },
          create: {
            outletId,
            productId: item.productId,
            quantity: new Decimal(quantityAfter),
          },
          update: {
            quantity: new Decimal(quantityAfter),
          },
        });

        await tx.stockMovement.create({
          data: {
            outletId,
            productId: item.productId,
            type: 'SALE',
            quantity: new Decimal(item.quantity * -1),
            quantityBefore: new Decimal(item.availableBefore),
            quantityAfter: new Decimal(quantityAfter),
            referenceType: 'transaction',
            referenceId: created.id,
            notes: `Checkout cash POS - ${item.notes}`,
            createdById: user.sub,
          },
        });
      }

      if (loyaltyRedeem.pointsRedeemed > 0 && customerId) {
        await this.customersService.recordLoyaltyRedeemInTransaction(tx, {
          tenantId: user.tenantId,
          customerId,
          pointsRedeemed: loyaltyRedeem.pointsRedeemed,
          transactionId: created.id,
        });
      }

      return created;
    });

    const loyaltyMeta = await this.applyLoyaltyEarn(
      user.tenantId,
      customerId,
      subtotal - discount,
      transaction.id,
    );

    const delivery = await this.applyCheckoutDelivery(
      user,
      transaction.id,
      outletId,
      customerId,
      dto,
    );

    return this.buildCheckoutResponse(
      transaction,
      normalizedItems.length,
      undefined,
      dto.cashReceived,
      marginWarnings,
      {
        ...loyaltyMeta,
        ...(loyaltyRedeem.pointsRedeemed > 0
          ? {
              pointsRedeemed: loyaltyRedeem.pointsRedeemed,
              loyaltyDiscount: loyaltyRedeem.discountIdr,
            }
          : {}),
      },
      delivery,
    );
  }

  async checkoutSplit(user: AuthJwtPayload, dto: CheckoutSplitDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    this.assertLinkedCustomerForFinancePayments(dto.payments, dto.customerId);
    const existing = await this.findExistingTransactionByRequest(outletId, dto.clientRequestId);
    if (existing) {
      const existingPaymentSummary = existing.payments.reduce<Record<string, number>>((acc, payment) => {
        acc[payment.method] = toIdrInteger(payment.amount);
        return acc;
      }, {});
      const delivery = await this.applyCheckoutDelivery(
        user,
        existing.id,
        outletId,
        existing.customerId,
        dto,
      );
      return this.buildCheckoutResponse(
        existing,
        existing.items.length,
        existingPaymentSummary,
        undefined,
        undefined,
        undefined,
        delivery,
      );
    }

    const { activeShift, normalizedItems, subtotal, stockDeductions, productMap } =
      await this.resolveActiveShiftAndCart(user, outletId, dto.items);
    const marginWarnings = this.computeMarginWarnings(productMap, dto.items, outletId);
    const promoLines = this.buildPromoCartLines(normalizedItems, productMap);
    const promo = await this.promoService.resolveCheckoutDiscount(user, dto.promoRuleId, promoLines);
    const promoDiscount = promo.discountAmount;
    const customerId = await this.customersService.resolveOptionalCustomerId(user.tenantId, dto);
    const loyaltyRedeem = await this.customersService.resolveLoyaltyRedeem({
      tenantId: user.tenantId,
      customerId,
      pointsRequested: dto.loyaltyPointsToRedeem ?? 0,
      netAfterPromoIdr: Math.max(0, subtotal - promoDiscount),
    });
    const discount = promoDiscount + loyaltyRedeem.discountIdr;
    const taxConfig = await this.getTenantTaxConfig(user.tenantId);
    const { tax, total } = computePosTax({
      subtotal,
      discount,
      ...taxConfig,
    });

    let customerCreditLimitIdr: number | null = null;
    let customerOutstandingIdr = 0;
    let depositBalanceIdr = 0;
    if (customerId) {
      const customerRow = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId: user.tenantId },
        select: { creditLimit: true },
      });
      customerCreditLimitIdr =
        customerRow?.creditLimit != null ? toIdrInteger(customerRow.creditLimit) : null;
      customerOutstandingIdr = await this.financeCheckout.getCustomerOutstandingReceivableIdr(
        user.tenantId,
        customerId,
      );
      depositBalanceIdr = await this.financeCheckout.getCustomerDepositBalanceIdr(
        user.tenantId,
        customerId,
      );
    }

    const creditTotal = dto.payments
      .filter((p) => p.method === PaymentMethod.CREDIT)
      .reduce((sum, p) => sum + p.amount, 0);

    let overLimitApproved = false;
    let creditApproverId: string | null = null;
    if (
      creditTotal > 0 &&
      customerId &&
      customerCreditLimitIdr != null &&
      customerOutstandingIdr + creditTotal > customerCreditLimitIdr
    ) {
      if (dto.managerApprovalToken?.trim()) {
        const approval = this.creditLimitService.validateAndConsumeApprovalToken(
          dto.managerApprovalToken.trim(),
          {
            tenantId: user.tenantId,
            customerId,
            creditAmount: creditTotal,
          },
        );
        overLimitApproved = true;
        creditApproverId = approval.approvedById;
      }
    }

    this.financeCheckout.assertCheckoutFinancePayments({
      payments: dto.payments,
      customerId,
      tenantId: user.tenantId,
      customerCreditLimitIdr,
      customerOutstandingIdr,
      depositBalanceIdr,
      overLimitApproved,
    });
    this.assertValidSplitPayments(dto.payments, total);

    const receiptNo = `TRX-${Date.now()}`;
    const notes = dto.notes?.trim() || null;
    const promoNote = promo.promoName ? `Promo: ${promo.promoName}` : null;
    const loyaltyNote =
      loyaltyRedeem.pointsRedeemed > 0
        ? `Loyalty: -${loyaltyRedeem.pointsRedeemed} poin (−${loyaltyRedeem.discountIdr} IDR)`
        : null;
    const mergedNotes = [notes, promoNote, loyaltyNote].filter(Boolean).join(' | ') || null;
    const creditDueDate = await this.resolveCreditDueDate(
      user.tenantId,
      dto.creditTermsDays,
      creditTotal > 0,
    );
    const transaction = await this.runWithRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.transaction.create({
          data: {
            outletId,
            cashierId: user.sub,
            shiftId: activeShift.id,
            customerId,
            receiptNo,
            clientRequestId: dto.clientRequestId?.trim() || null,
            subtotal: idrToDecimal(subtotal),
            discount: idrToDecimal(discount),
            tax: idrToDecimal(tax),
            total: idrToDecimal(total),
            notes: mergedNotes,
            status: 'COMPLETED',
            completedAt: new Date(),
            items: {
              create: normalizedItems.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: new Decimal(item.quantity),
                sellUnitId: item.sellUnitId ?? null,
                sellUnitSymbol: item.sellUnitSymbol ?? null,
                unitPrice: idrToDecimal(item.unitPrice),
                discount: idrToDecimal(0),
                tax: idrToDecimal(0),
                subtotal: idrToDecimal(item.lineSubtotal),
              })),
            },
            payments: {
              create: dto.payments.map((payment) => ({
                method: payment.method,
                amount: idrToDecimal(payment.amount),
                reference: payment.reference?.trim() || null,
              })),
            },
          },
        });

        for (const item of stockDeductions) {
          const quantityAfter = item.availableBefore - item.quantity;
          await tx.inventoryItem.upsert({
            where: {
              outletId_productId: {
                outletId,
                productId: item.productId,
              },
            },
            create: {
              outletId,
              productId: item.productId,
              quantity: new Decimal(quantityAfter),
            },
            update: {
              quantity: new Decimal(quantityAfter),
            },
          });
          await tx.stockMovement.create({
            data: {
              outletId,
              productId: item.productId,
              type: 'SALE',
                quantity: new Decimal(item.quantity * -1),
              quantityBefore: new Decimal(item.availableBefore),
              quantityAfter: new Decimal(quantityAfter),
              referenceType: 'transaction',
              referenceId: created.id,
                notes: `Checkout split POS - ${item.notes}`,
              createdById: user.sub,
            },
          });
        }

        if (loyaltyRedeem.pointsRedeemed > 0 && customerId) {
          await this.customersService.recordLoyaltyRedeemInTransaction(tx, {
            tenantId: user.tenantId,
            customerId,
            pointsRedeemed: loyaltyRedeem.pointsRedeemed,
            transactionId: created.id,
          });
        }

        if (customerId) {
          await this.financeCheckout.applyCheckoutFinanceInTransaction(tx, {
            tenantId: user.tenantId,
            customerId,
            outletId,
            transactionId: created.id,
            recordedById: user.sub,
            payments: dto.payments,
            dueDate: creditDueDate,
          });

          if (creditTotal > 0) {
            await this.creditLimitService.logCreditCheckoutInTransaction(tx, {
              tenantId: user.tenantId,
              customerId,
              creditAmount: creditTotal,
              transactionId: created.id,
              recordedById: user.sub,
              approvedById: creditApproverId,
              overLimitApproved,
            });
          }
        }

        return created;
      }),
    );

    const paymentSummary = dto.payments.reduce<Record<string, number>>((acc, payment) => {
      acc[payment.method] = payment.amount;
      return acc;
    }, {});

    const loyaltyMeta = await this.applyLoyaltyEarn(
      user.tenantId,
      customerId,
      subtotal - discount,
      transaction.id,
    );

    const delivery = await this.applyCheckoutDelivery(
      user,
      transaction.id,
      outletId,
      customerId,
      dto,
    );

    return this.buildCheckoutResponse(
      transaction,
      normalizedItems.length,
      paymentSummary,
      undefined,
      marginWarnings,
      {
        ...loyaltyMeta,
        ...(loyaltyRedeem.pointsRedeemed > 0
          ? {
              pointsRedeemed: loyaltyRedeem.pointsRedeemed,
              loyaltyDiscount: loyaltyRedeem.discountIdr,
            }
          : {}),
      },
      delivery,
    );
  }

  private async applyLoyaltyEarn(
    tenantId: string,
    customerId: string | null,
    netSpendIdr: number,
    transactionId?: string,
  ): Promise<{ pointsEarned?: number; customerPoints?: number }> {
    if (!customerId || netSpendIdr <= 0) return {};
    const pointsEarned = await this.customersService.earnPointsForCompletedTransaction(
      tenantId,
      customerId,
      netSpendIdr,
      transactionId,
    );
    if (pointsEarned <= 0) return {};
    const updated = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { points: true },
    });
    return { pointsEarned, customerPoints: updated?.points };
  }

  private assertOutletAccess(user: AuthJwtPayload, outletId: string) {
    enforceOutletAccess(user, outletId);
  }

  private async loadTransactionForUser(user: AuthJwtPayload, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        outlet: { tenantId: user.tenantId },
      },
      include: {
        outlet: { select: { id: true, name: true, code: true, address: true, tenantId: true } },
        cashier: { select: { id: true, fullName: true } },
        items: true,
        payments: true,
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!transaction) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Transaksi tidak ditemukan.',
      });
    }

    this.assertOutletAccess(user, transaction.outletId);
    return transaction;
  }

  private sumRefundAmount(adjustments: Array<{ type: string; amount: Decimal }>): number {
    return adjustments
      .filter((row) => row.type === 'REFUND')
      .reduce((sum, row) => sum + toIdrInteger(row.amount), 0);
  }

  private async restoreSaleStock(
    tx: {
      stockMovement: PrismaService['stockMovement'];
      inventoryItem: PrismaService['inventoryItem'];
    },
    params: {
      outletId: string;
      transactionId: string;
      adjustmentId: string;
      createdById: string;
      notes: string;
    },
  ) {
    const saleMovements = await tx.stockMovement.findMany({
      where: {
        outletId: params.outletId,
        referenceType: 'transaction',
        referenceId: params.transactionId,
        type: 'SALE',
      },
    });

    for (const movement of saleMovements) {
      const restoreQty = Math.abs(Number(movement.quantity));
      if (restoreQty <= 0) {
        continue;
      }

      const inventory = await tx.inventoryItem.findUnique({
        where: {
          outletId_productId: {
            outletId: params.outletId,
            productId: movement.productId,
          },
        },
      });

      const quantityBefore = Number(inventory?.quantity ?? 0);
      const quantityAfter = quantityBefore + restoreQty;

      if (inventory) {
        await tx.inventoryItem.update({
          where: {
            outletId_productId: {
              outletId: params.outletId,
              productId: movement.productId,
            },
          },
          data: { quantity: new Decimal(quantityAfter) },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            outletId: params.outletId,
            productId: movement.productId,
            quantity: new Decimal(quantityAfter),
          },
        });
      }

      await tx.stockMovement.create({
        data: {
          outletId: params.outletId,
          productId: movement.productId,
          type: 'VOID_RESTORE',
          quantity: new Decimal(restoreQty),
          quantityBefore: new Decimal(quantityBefore),
          quantityAfter: new Decimal(quantityAfter),
          referenceType: 'transaction_adjustment',
          referenceId: params.adjustmentId,
          notes: params.notes,
          createdById: params.createdById,
        },
      });
    }
  }

  private buildDigitalReceipt(
    transaction: Awaited<ReturnType<TransactionsService['loadTransactionForUser']>>,
    tenantName: string,
  ): DigitalReceiptPayload {
    const refundedTotal = this.sumRefundAmount(transaction.adjustments);
    const total = toIdrInteger(transaction.total);
    const voidAmount = transaction.adjustments
      .filter((row) => row.type === 'VOID')
      .reduce((sum, row) => sum + toIdrInteger(row.amount), 0);

    return {
      receiptNo: transaction.receiptNo,
      transactionId: transaction.id,
      outlet: {
        id: transaction.outlet.id,
        name: transaction.outlet.name,
        code: transaction.outlet.code,
        address: transaction.outlet.address,
      },
      tenantName,
      cashier: {
        id: transaction.cashier.id,
        fullName: transaction.cashier.fullName,
      },
      status: transaction.status,
      items: transaction.items.map((item) => ({
        name: item.productName,
        quantity: Number(item.quantity),
        unitPrice: toIdrInteger(item.unitPrice),
        subtotal: toIdrInteger(item.subtotal),
      })),
      payments: transaction.payments.map((payment) => ({
        method: payment.method,
        amount: toIdrInteger(payment.amount),
        reference: payment.reference,
      })),
      subtotal: toIdrInteger(transaction.subtotal),
      discount: toIdrInteger(transaction.discount),
      tax: toIdrInteger(transaction.tax),
      total,
      notes: transaction.notes,
      completedAt: transaction.completedAt,
      adjustments: transaction.adjustments.map((row) => ({
        id: row.id,
        type: row.type,
        amount: toIdrInteger(row.amount),
        reason: row.reason,
        createdAt: row.createdAt,
      })),
      refundedTotal,
      netTotal: Math.max(0, total - refundedTotal - voidAmount),
    };
  }

  async listRecentTransactions(user: AuthJwtPayload, query: ListRecentTransactionsDto) {
    const outletId = resolveOutletId(user, query.outletId);
    const limit = query.limit ?? 25;

    let completedAtFilter: { not: null } | { gte: Date; lt: Date } = { not: null };
    if (query.dateFrom || query.dateTo) {
      const range = resolveReportDayRange(undefined, query.dateFrom, query.dateTo);
      completedAtFilter = { gte: range.startUtc, lt: range.endUtc };
    }

    const search = query.search?.trim();

    const rows = await this.prisma.transaction.findMany({
      where: {
        outletId,
        outlet: { tenantId: user.tenantId },
        completedAt: completedAtFilter,
        ...(query.status && query.status !== 'ALL' ? { status: query.status } : {}),
        ...(search ? { receiptNo: { contains: search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        receiptNo: true,
        total: true,
        status: true,
        completedAt: true,
        cashier: { select: { fullName: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      receiptNo: row.receiptNo,
      total: toIdrInteger(row.total),
      status: row.status,
      completedAt: row.completedAt,
      cashierName: row.cashier.fullName,
    }));
  }

  private async resolveVoidApprover(
    user: AuthJwtPayload,
    dto: VoidTransactionDto,
    outletId: string,
  ): Promise<string> {
    const privilegedRoles = new Set<string>([UserRole.OWNER, UserRole.MANAGER]);
    if (privilegedRoles.has(user.role)) {
      return user.sub;
    }

    const managerEmail = dto.managerEmail?.trim().toLowerCase();
    const managerPassword = dto.managerPassword;
    if (!managerEmail || !managerPassword) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Void membutuhkan persetujuan manager. Isi email dan password manager.',
      });
    }

    const manager = await this.prisma.user.findFirst({
      where: {
        email: managerEmail,
        isActive: true,
        tenantId: user.tenantId,
        role: { in: [UserRole.OWNER, UserRole.MANAGER] },
        userOutlets: { some: { outletId } },
      },
    });

    if (!manager) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Kredensial manager tidak valid atau tidak memiliki akses outlet ini.',
      });
    }

    const passwordValid = await bcrypt.compare(managerPassword, manager.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Kredensial manager tidak valid atau tidak memiliki akses outlet ini.',
      });
    }

    return manager.id;
  }

  async voidTransaction(user: AuthJwtPayload, transactionId: string, dto: VoidTransactionDto) {
    const transaction = await this.loadTransactionForUser(user, transactionId);
    const outletId = resolveOutletId(user, dto.outletId ?? transaction.outletId);
    const approvedById = await this.resolveVoidApprover(user, dto, outletId);

    if (transaction.status !== 'COMPLETED') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.TRANSACTION_ALREADY_CLOSED,
        message: 'Hanya transaksi selesai yang dapat di-void.',
      });
    }

    if (transaction.adjustments.some((row) => row.type === 'VOID' || row.type === 'REFUND')) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Transaksi sudah memiliki penyesuaian void/refund.',
      });
    }

    const amount = toIdrInteger(transaction.total);
    const reason = dto.reason.trim();

    const result = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.transactionAdjustment.create({
        data: {
          transactionId: transaction.id,
          type: 'VOID',
          amount: idrToDecimal(amount),
          reason,
          createdById: user.sub,
          approvedById,
        },
      });

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'VOID' },
      });

      await this.restoreSaleStock(tx, {
        outletId: transaction.outletId,
        transactionId: transaction.id,
        adjustmentId: adjustment.id,
        createdById: user.sub,
        notes: `Void transaksi ${transaction.receiptNo}`,
      });

      await this.financeCheckout.reverseFinanceForVoid(tx, {
        tenantId: user.tenantId,
        transactionId: transaction.id,
        recordedById: user.sub,
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'TRANSACTION_VOID',
          entityType: 'transaction',
          entityId: transaction.id,
          metadata: {
            adjustmentId: adjustment.id,
            receiptNo: transaction.receiptNo,
            outletId: transaction.outletId,
            amount,
            reason,
            approvedById,
            requestedByRole: user.role,
          },
        },
      });

      return adjustment;
    });

    return {
      transactionId: transaction.id,
      receiptNo: transaction.receiptNo,
      adjustment: {
        id: result.id,
        type: 'VOID' as const,
        amount,
        reason: result.reason,
        approvedById: result.approvedById,
        createdAt: result.createdAt,
      },
      status: 'VOID' as const,
    };
  }

  async refundTransaction(user: AuthJwtPayload, transactionId: string, dto: RefundTransactionDto) {
    const transaction = await this.loadTransactionForUser(user, transactionId);
    resolveOutletId(user, dto.outletId ?? transaction.outletId);

    if (transaction.status === 'VOID') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.TRANSACTION_ALREADY_CLOSED,
        message: 'Transaksi void tidak dapat di-refund.',
      });
    }

    if (transaction.status !== 'COMPLETED' && transaction.status !== 'REFUNDED') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.TRANSACTION_ALREADY_CLOSED,
        message: 'Hanya transaksi selesai yang dapat di-refund.',
      });
    }

    if (transaction.adjustments.some((row) => row.type === 'VOID')) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Transaksi void tidak dapat di-refund.',
      });
    }

    const transactionTotal = toIdrInteger(transaction.total);
    const refundedSoFar = this.sumRefundAmount(transaction.adjustments);
    const remaining = transactionTotal - refundedSoFar;

    if (remaining <= 0) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Transaksi sudah di-refund penuh.',
      });
    }

    if (dto.amount > remaining) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: `Nominal refund melebihi sisa yang dapat dikembalikan (Rp ${remaining}).`,
      });
    }

    const reason = dto.reason.trim();
    const isFullRefund = dto.amount === remaining;

    const result = await this.prisma.$transaction(async (tx) => {
      const adjustment = await tx.transactionAdjustment.create({
        data: {
          transactionId: transaction.id,
          type: 'REFUND',
          amount: idrToDecimal(dto.amount),
          reason,
          createdById: user.sub,
          approvedById: user.sub,
        },
      });

      if (isFullRefund) {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'REFUNDED' },
        });

        await this.restoreSaleStock(tx, {
          outletId: transaction.outletId,
          transactionId: transaction.id,
          adjustmentId: adjustment.id,
          createdById: user.sub,
          notes: `Refund penuh transaksi ${transaction.receiptNo}`,
        });
      }

      await this.financeCheckout.reverseFinanceForRefund(tx, {
        tenantId: user.tenantId,
        transactionId: transaction.id,
        recordedById: user.sub,
        refundAmountIdr: dto.amount,
        isFullRefund,
      });

      await tx.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.sub,
          action: 'TRANSACTION_REFUND',
          entityType: 'transaction',
          entityId: transaction.id,
          metadata: {
            adjustmentId: adjustment.id,
            receiptNo: transaction.receiptNo,
            outletId: transaction.outletId,
            amount: dto.amount,
            isFullRefund,
            reason,
          },
        },
      });

      return adjustment;
    });

    return {
      transactionId: transaction.id,
      receiptNo: transaction.receiptNo,
      adjustment: {
        id: result.id,
        type: 'REFUND' as const,
        amount: dto.amount,
        reason: result.reason,
        approvedById: result.approvedById,
        createdAt: result.createdAt,
      },
      status: isFullRefund ? ('REFUNDED' as const) : transaction.status,
      refundedTotal: refundedSoFar + dto.amount,
      remainingRefundable: remaining - dto.amount,
    };
  }

  async getReceipt(user: AuthJwtPayload, transactionId: string, outletId?: string) {
    const transaction = await this.loadTransactionForUser(user, transactionId);
    if (outletId) {
      resolveOutletId(user, outletId);
      if (transaction.outletId !== outletId) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Transaksi tidak ditemukan di outlet ini.',
        });
      }
    }

    if (!transaction.completedAt) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: 'Struk hanya tersedia untuk transaksi yang sudah selesai.',
      });
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });

    const receipt = this.buildDigitalReceipt(transaction, tenant?.name ?? 'Barokah POS');
    return {
      receipt,
      escpos: buildEscPosStub(receipt),
    };
  }
}
