import {
  convertFromBaseQuantity,
  formatAvailableStockLabel,
  formatQtyWithUnit,
  type ProductUnitConversionLike,
} from '@barokah/shared';
import { evaluateAddToCartStock } from '@/lib/stock-errors';

export interface PosSellUnitLike {
  id: string;
  symbol: string;
  conversionToBase: number;
  isDefault?: boolean;
}

export interface ProductStockView {
  stockQty?: number;
  baseUnitSymbol?: string;
  sellUnits?: PosSellUnitLike[];
}

export interface ProductStockBadge {
  text: string;
  isOutOfStock: boolean;
  hint?: string;
}

export function isOutOfStock(stockQty?: number): boolean {
  return stockQty != null && stockQty <= 0;
}

function resolveSecondarySellUnit(
  stockQty: number,
  baseUnitSymbol: string | undefined,
  sellUnits?: PosSellUnitLike[],
): { symbol: string; conversionToBase: number } | null {
  if (!sellUnits?.length || stockQty <= 0) {
    return null;
  }

  const altUnits = sellUnits.filter(
    (unit) => unit.conversionToBase > 0 && unit.symbol !== baseUnitSymbol,
  );
  if (altUnits.length === 0) {
    return null;
  }

  const preferred = altUnits.find((unit) => unit.isDefault) ?? altUnits[0];
  return { symbol: preferred.symbol, conversionToBase: preferred.conversionToBase };
}

export function formatProductStockBadge(product: ProductStockView): ProductStockBadge | null {
  if (product.stockQty == null) {
    return null;
  }

  if (product.stockQty <= 0) {
    return {
      text: 'Habis',
      isOutOfStock: true,
      hint: 'Stok: 0 (habis)',
    };
  }

  const baseSymbol = product.baseUnitSymbol ?? '';
  const text = `Stok: ${formatQtyWithUnit(product.stockQty, baseSymbol)}`.trim();
  const secondary = resolveSecondarySellUnit(product.stockQty, product.baseUnitSymbol, product.sellUnits);
  const hint = secondary
    ? `≈ ${formatQtyWithUnit(
        convertFromBaseQuantity(product.stockQty, secondary.conversionToBase),
        secondary.symbol,
      )}`
    : undefined;

  return { text, isOutOfStock: false, hint };
}

export function formatCartAvailableLabel(params: {
  stockQty?: number;
  baseUnitSymbol?: string;
  sellUnitId?: string;
  sellUnitSymbol?: string;
  unitConversions?: ProductUnitConversionLike[];
}): string | null {
  if (params.stockQty == null) {
    return null;
  }

  const conversion = params.sellUnitId
    ? params.unitConversions?.find((row) => row.unitId === params.sellUnitId)
    : undefined;
  const hasAltSell =
    params.sellUnitSymbol &&
    params.baseUnitSymbol &&
    params.sellUnitSymbol !== params.baseUnitSymbol &&
    conversion?.conversionToBase;

  const label = formatAvailableStockLabel({
    availableBaseQty: params.stockQty,
    baseUnitSymbol: params.baseUnitSymbol ?? '',
    sellUnitSymbol: hasAltSell ? params.sellUnitSymbol : undefined,
    conversionToBase: hasAltSell ? conversion?.conversionToBase : undefined,
  });

  return `Tersedia: ${label}`;
}

export function evaluateCartLineStock(params: {
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
}): { availableLabel: string | null; warning: string | null } {
  const availableLabel = formatCartAvailableLabel({
    stockQty: params.stockQty,
    baseUnitSymbol: params.baseUnitSymbol,
    sellUnitId: params.sellUnitId,
    sellUnitSymbol: params.sellUnitSymbol,
    unitConversions: params.unitConversions,
  });

  const stockCheck = evaluateAddToCartStock({
    productId: params.productId,
    productName: params.productName,
    stockQty: params.stockQty,
    baseUnitId: params.baseUnitId,
    baseUnitSymbol: params.baseUnitSymbol,
    lineQty: params.lineQty,
    sellUnitId: params.sellUnitId,
    sellUnitSymbol: params.sellUnitSymbol,
    unitConversions: params.unitConversions,
    cart: params.cart.filter(
      (row) => !(row.productId === params.productId && row.sellUnitId === params.sellUnitId),
    ),
  });

  return {
    availableLabel,
    warning: stockCheck.ok ? null : stockCheck.message,
  };
}
