import { formatNumberID } from './format-number';
import { convertFromBaseQuantity } from './unit-conversion';

export const INSUFFICIENT_STOCK_CONSTRAINT = 'insufficientStock';

export interface InsufficientStockContext {
  productId?: string;
  productName: string;
  availableBaseQty: number;
  requestedBaseQty: number;
  baseUnitSymbol: string;
  sellQty?: number;
  sellUnitSymbol?: string;
  conversionToBase?: number;
}

export interface InsufficientStockDetailValue {
  productId?: string;
  productName: string;
  availableBaseQty: number;
  requestedBaseQty: number;
  baseUnitSymbol: string;
  sellQty?: number;
  sellUnitSymbol?: string;
  conversionToBase?: number;
}

export function formatQtyWithUnit(qty: number, unitSymbol: string): string {
  const formatted = formatNumberID(qty);
  return unitSymbol ? `${formatted} ${unitSymbol}` : formatted;
}

export function formatAvailableStockLabel(
  ctx: Pick<
    InsufficientStockContext,
    'availableBaseQty' | 'baseUnitSymbol' | 'sellUnitSymbol' | 'conversionToBase'
  >,
): string {
  const base = formatQtyWithUnit(ctx.availableBaseQty, ctx.baseUnitSymbol);
  if (ctx.sellUnitSymbol && ctx.conversionToBase && ctx.conversionToBase > 0) {
    const alt = convertFromBaseQuantity(ctx.availableBaseQty, ctx.conversionToBase);
    return `${base} (${formatQtyWithUnit(alt, ctx.sellUnitSymbol)})`;
  }
  return base;
}

export function formatRequestedStockLabel(
  ctx: Pick<
    InsufficientStockContext,
    'requestedBaseQty' | 'baseUnitSymbol' | 'sellQty' | 'sellUnitSymbol'
  >,
): string {
  if (ctx.sellQty != null && ctx.sellUnitSymbol && ctx.sellQty > 0) {
    return `${formatQtyWithUnit(ctx.sellQty, ctx.sellUnitSymbol)} (${formatQtyWithUnit(ctx.requestedBaseQty, ctx.baseUnitSymbol)})`;
  }
  return formatQtyWithUnit(ctx.requestedBaseQty, ctx.baseUnitSymbol);
}

export function formatEmptyStockMessage(productName: string): string {
  return `Stok ${productName} habis. Tidak bisa ditambahkan ke keranjang.`;
}

export function formatInsufficientStockMessage(ctx: InsufficientStockContext): string {
  if (ctx.availableBaseQty <= 0) {
    return formatEmptyStockMessage(ctx.productName);
  }

  const available = formatAvailableStockLabel(ctx);
  const requested = formatRequestedStockLabel(ctx);

  const hasAltSell =
    ctx.sellUnitSymbol &&
    ctx.conversionToBase &&
    ctx.conversionToBase > 0 &&
    ctx.sellQty != null &&
    ctx.sellUnitSymbol !== ctx.baseUnitSymbol;

  if (hasAltSell) {
    return `Stok tidak cukup. Tersedia: ${available}, diminta: ${requested}.`;
  }

  return `Stok tidak cukup untuk ${ctx.productName}. Tersedia: ${available}, diminta: ${requested}.`;
}

export function buildInsufficientStockDetail(ctx: InsufficientStockContext, field = 'items') {
  const message = formatInsufficientStockMessage(ctx);
  const value: InsufficientStockDetailValue = {
    productId: ctx.productId,
    productName: ctx.productName,
    availableBaseQty: ctx.availableBaseQty,
    requestedBaseQty: ctx.requestedBaseQty,
    baseUnitSymbol: ctx.baseUnitSymbol,
    sellQty: ctx.sellQty,
    sellUnitSymbol: ctx.sellUnitSymbol,
    conversionToBase: ctx.conversionToBase,
  };

  return {
    field,
    message,
    constraint: INSUFFICIENT_STOCK_CONSTRAINT,
    value,
  };
}

export function isInsufficientStockDetailValue(value: unknown): value is InsufficientStockDetailValue {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const row = value as InsufficientStockDetailValue;
  return typeof row.productName === 'string' && typeof row.availableBaseQty === 'number';
}
