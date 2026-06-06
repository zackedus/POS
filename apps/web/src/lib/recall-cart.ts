export interface RecallCartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sellUnitId?: string;
  unitSymbol?: string;
}

export interface RecallCatalogProduct {
  id: string;
  moq?: number;
  orderStep?: number;
  unit?: { id?: string; symbol: string; name?: string } | null;
  sellUnits?: Array<{
    id: string;
    symbol: string;
    name?: string;
    price: number;
    sellStep?: number;
    minQty?: number;
    conversionToBase?: number;
  }>;
}

export interface RecalledCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unitSymbol?: string;
  sellUnitId?: string;
  orderStep: number;
  moq?: number;
  baseUnitId?: string;
  sellUnits?: RecallCatalogProduct['sellUnits'];
  unitConversions?: Array<{
    unitId: string;
    conversionToBase: number;
    isPurchaseUnit: boolean;
    isSellUnit: boolean;
    sellStep?: number;
    minQty?: number;
  }>;
}

function buildCartConversions(product: RecallCatalogProduct) {
  if (!product.sellUnits?.length) return [];
  return product.sellUnits.map((unit) => ({
    unitId: unit.id,
    conversionToBase: unit.conversionToBase ?? 1,
    isPurchaseUnit: false,
    isSellUnit: true,
    sellStep: unit.sellStep,
    minQty: unit.minQty,
  }));
}

function resolveOrderStep(product: RecallCatalogProduct, sellUnitId?: string): number {
  if (sellUnitId && product.sellUnits) {
    const alt = product.sellUnits.find((unit) => unit.id === sellUnitId);
    if (alt?.sellStep && alt.sellStep > 0) return alt.sellStep;
  }
  return product.orderStep && product.orderStep > 0 ? product.orderStep : 1;
}

/** Restore POS cart lines from recall API response + catalog metadata. */
export function mapRecallItemsToCart(
  items: RecallCartLine[],
  catalog: RecallCatalogProduct[],
): RecalledCartItem[] {
  const catalogMap = new Map(catalog.map((product) => [product.id, product]));

  return items.map((item) => {
    const product = catalogMap.get(item.productId);
    const sellUnitId = item.sellUnitId;
    const sellUnit = sellUnitId ? product?.sellUnits?.find((unit) => unit.id === sellUnitId) : undefined;
    const orderStep = product ? resolveOrderStep(product, sellUnitId) : 1;

    return {
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      unitSymbol: item.unitSymbol ?? sellUnit?.symbol ?? product?.unit?.symbol,
      sellUnitId,
      orderStep,
      moq: product?.moq,
      baseUnitId: product?.unit?.id,
      sellUnits: product?.sellUnits,
      unitConversions: product ? buildCartConversions(product) : [],
    };
  });
}
