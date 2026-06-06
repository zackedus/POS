export interface ProductGridItem {
  id: string;
  name: string;
  sku: string;
  variantLabel?: string | null;
  price: number;
  moq?: number;
  orderStep?: number;
  unit?: { id?: string; name: string; symbol: string } | null;
  category?: { id: string; name: string } | null;
  categoryId?: string | null;
  sellUnits?: Array<{
    id: string;
    name: string;
    symbol: string;
    conversionToBase: number;
    price: number;
    sellStep?: number;
    minQty?: number;
    isDefault?: boolean;
  }>;
  isBundle?: boolean;
  imageUrl?: string | null;
  bundleItems?: Array<{
    productId: string;
    sku?: string;
    name?: string;
    quantity: number;
  }>;
  bundlePolicy?: {
    scope?: 'TENANT' | 'OUTLET';
    outletId?: string;
    outletName?: string;
    behavior?: 'ALLOW' | 'WARN' | 'BLOCK';
    message?: string;
  } | null;
  outletBehavior?: ProductGridItem['bundlePolicy'];
  stockQty?: number;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unitSymbol?: string;
  sellUnitId?: string;
  orderStep: number;
  moq?: number;
  baseUnitId?: string;
  sellUnits?: ProductGridItem['sellUnits'];
  unitConversions?: Array<{
    unitId: string;
    conversionToBase: number;
    isPurchaseUnit: boolean;
    isSellUnit: boolean;
    sellStep?: number;
    minQty?: number;
  }>;
}

export type PaymentMode = 'CASH' | 'TRANSFER' | 'QRIS' | 'SPLIT';

export interface HeldTransactionSummary {
  id: string;
  label?: string | null;
  total: number;
  createdAt?: string;
  expiresAt: string;
  itemCount: number;
}
