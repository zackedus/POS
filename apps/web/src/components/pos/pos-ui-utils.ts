import type { ProductGridItem } from './pos-types';

/** Short SKU for cashier scan reference — hide long internal IDs. */
export function formatShortSku(sku: string): string {
  const trimmed = sku.trim();
  if (trimmed.length <= 12) {
    return trimmed;
  }
  const segments = trimmed.split('-').filter(Boolean);
  if (segments.length >= 2) {
    const tail = segments.slice(-2).join('-');
    if (tail.length <= 14) {
      return tail;
    }
  }
  return `${trimmed.slice(0, 10)}…`;
}

export function extractCategoryFilters(products: ProductGridItem[]): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const product of products) {
    if (product.category?.id && product.category.name) {
      map.set(product.category.id, product.category.name);
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'));
}

export function resolveDisplaySellUnit(product: ProductGridItem): {
  sellUnitId?: string;
  unitSymbol?: string;
  price: number;
} {
  const sellUnits = product.sellUnits ?? [];
  if (sellUnits.length > 0) {
    const picked = sellUnits.find((unit) => unit.isDefault) ?? sellUnits[0];
    return {
      sellUnitId: picked.id,
      unitSymbol: picked.symbol,
      price: picked.price,
    };
  }
  return {
    unitSymbol: product.unit?.symbol,
    price: product.price,
  };
}

export function hasMultipleSellUnits(product: ProductGridItem): boolean {
  return Boolean(product.sellUnits && product.sellUnits.length > 1);
}

export function isBundleProduct(product: ProductGridItem): boolean {
  return Boolean(product.isBundle ?? (product.bundleItems && product.bundleItems.length > 0));
}
