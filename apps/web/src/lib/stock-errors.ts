import {
  convertToBaseQuantity,
  formatEmptyStockMessage,
  formatInsufficientStockMessage,
  isInsufficientStockDetailValue,
  roundQty,
  type InsufficientStockContext,
  type ProductUnitConversionLike,
} from '@barokah/shared';

export interface StockApiErrorPayload {
  code?: string;
  message?: string;
  details?: Array<{
    field?: string;
    message?: string;
    constraint?: string;
    value?: unknown;
  }>;
}

export interface CartStockIssue {
  productId: string;
  productName: string;
  message: string;
}

export function resolveStockErrorMessage(error?: StockApiErrorPayload | null): string | null {
  if (!error || error.code !== 'INSUFFICIENT_STOCK') {
    return null;
  }

  const detail = error.details?.find((row) => isInsufficientStockDetailValue(row.value));
  if (detail?.value && isInsufficientStockDetailValue(detail.value)) {
    return formatInsufficientStockMessage(detail.value);
  }

  if (detail?.message?.trim()) {
    return detail.message.trim();
  }

  return error.message?.trim() || null;
}

export function buildClientStockContext(params: {
  productId: string;
  productName: string;
  availableBaseQty: number;
  requestedBaseQty: number;
  baseUnitSymbol: string;
  sellQty?: number;
  sellUnitSymbol?: string;
  sellUnitId?: string;
  baseUnitId?: string;
  unitConversions?: ProductUnitConversionLike[];
}): InsufficientStockContext {
  const conversion = params.sellUnitId
    ? params.unitConversions?.find((row) => row.unitId === params.sellUnitId)
    : undefined;

  return {
    productId: params.productId,
    productName: params.productName,
    availableBaseQty: params.availableBaseQty,
    requestedBaseQty: params.requestedBaseQty,
    baseUnitSymbol: params.baseUnitSymbol,
    sellQty: params.sellQty,
    sellUnitSymbol: params.sellUnitSymbol,
    conversionToBase: conversion?.conversionToBase,
  };
}

export function sumCartBaseQuantity(
  cart: Array<{
    productId: string;
    quantity: number;
    sellUnitId?: string;
    baseUnitId?: string;
    unitConversions?: ProductUnitConversionLike[];
  }>,
  productId: string,
  baseUnitId: string,
): number {
  return cart
    .filter((item) => item.productId === productId)
    .reduce((sum, item) => {
      const baseQty = convertToBaseQuantity(
        item.quantity,
        item.sellUnitId ?? baseUnitId,
        baseUnitId,
        item.unitConversions ?? [],
      );
      return roundQty(sum + baseQty);
    }, 0);
}

export function evaluateAddToCartStock(params: {
  productId: string;
  productName: string;
  stockQty?: number;
  baseUnitId?: string;
  baseUnitSymbol?: string;
  lineQty: number;
  sellUnitId?: string;
  sellUnitSymbol?: string;
  unitConversions?: ProductUnitConversionLike[];
  cart: Array<{
    productId: string;
    quantity: number;
    sellUnitId?: string;
    baseUnitId?: string;
    unitConversions?: ProductUnitConversionLike[];
  }>;
}): { ok: true } | { ok: false; message: string } {
  if (params.stockQty == null || !params.baseUnitId) {
    return { ok: true };
  }

  const otherLinesBase = params.cart
    .filter((item) => !(item.productId === params.productId && item.sellUnitId === params.sellUnitId))
    .reduce((sum, item) => {
      const baseQty = convertToBaseQuantity(
        item.quantity,
        item.sellUnitId ?? params.baseUnitId!,
        params.baseUnitId!,
        item.unitConversions ?? params.unitConversions ?? [],
      );
      return roundQty(sum + baseQty);
    }, 0);
  const lineBase = convertToBaseQuantity(
    params.lineQty,
    params.sellUnitId ?? params.baseUnitId,
    params.baseUnitId,
    params.unitConversions ?? [],
  );
  const requestedBaseQty = roundQty(otherLinesBase + lineBase);

  if (params.stockQty <= 0) {
    return { ok: false, message: formatEmptyStockMessage(params.productName) };
  }

  if (requestedBaseQty > params.stockQty) {
    const ctx = buildClientStockContext({
      productId: params.productId,
      productName: params.productName,
      availableBaseQty: params.stockQty,
      requestedBaseQty,
      baseUnitSymbol: params.baseUnitSymbol ?? 'unit',
      sellQty: params.lineQty,
      sellUnitSymbol: params.sellUnitSymbol,
      sellUnitId: params.sellUnitId,
      baseUnitId: params.baseUnitId,
      unitConversions: params.unitConversions,
    });
    return { ok: false, message: formatInsufficientStockMessage(ctx) };
  }

  return { ok: true };
}
