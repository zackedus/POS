import { ApiRequestError } from '@/lib/api';
import { publicApiJson } from '@/lib/api-client';
import { apiConfig } from '@/lib/api';
import type { CartLine, CheckoutCustomer, StoreCategory, StoreOutlet, StoreProduct } from './types';

const STORE_BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/store`;

async function storeFetch<T>(path: string, init?: RequestInit, fallback = 'Permintaan gagal.'): Promise<T> {
  try {
    return await publicApiJson<T>(
      `${STORE_BASE}${path}`,
      {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
        },
      },
      fallback,
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'name' in err && (err as ApiRequestError).name === 'ApiRequestError') {
      const apiErr = err as ApiRequestError;
      const error = new Error(apiErr.message) as Error & { code?: string };
      error.code = apiErr.code;
      throw error;
    }
    throw err;
  }
}

export interface StoreProductVariant {
  id: string;
  name: string;
  sku: string;
  variantLabel?: string | null;
  price: number;
  moq: number;
  orderStep: number;
  stockStatus?: 'AVAILABLE' | 'OUT_OF_STOCK';
}

export interface CatalogProductItem {
  id: string;
  name: string;
  sku: string;
  unitSymbol: string;
  price: number;
  imageUrl: string | null;
  placeholderKey: string;
  stockStatus: 'AVAILABLE' | 'OUT_OF_STOCK';
  moq: number;
  orderStep: number;
  hasVariants?: boolean;
  variants?: StoreProductVariant[];
}

export type StoreFulfillmentType = 'PICKUP' | 'DELIVERY';

export interface DeliveryAddressInput {
  street: string;
  district: string;
  city: string;
  postalCode?: string;
}

export interface CreateOrderResult {
  order: {
    id: string;
    orderNo: string;
    status: string;
    fulfillmentType: StoreFulfillmentType;
    outlet: StoreOutlet;
    customer: CheckoutCustomer;
    subtotal: number;
    tax: number;
    shippingFee: number;
    total: number;
    expiresAt: string | null;
  };
  payment: {
    snapToken: string;
    redirectUrl: string;
  };
}

export async function fetchTenantOutlets(slug: string): Promise<StoreOutlet[]> {
  const data = await storeFetch<{ outlets: StoreOutlet[] }>(`/${slug}/outlets`);
  return data.outlets;
}

export async function fetchTenantDisplayName(slug: string): Promise<string> {
  const outlets = await fetchTenantOutlets(slug);
  if (outlets.length === 0) {
    throw new Error('Toko tidak ditemukan.');
  }
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchCategories(slug: string, outletId: string): Promise<StoreCategory[]> {
  const data = await storeFetch<{ categories: StoreCategory[] }>(
    `/${slug}/catalog/categories?outletId=${outletId}`,
  );
  return data.categories;
}

export async function fetchProducts(
  slug: string,
  opts: { outletId: string; categoryId?: string; q?: string },
): Promise<CatalogProductItem[]> {
  const params = new URLSearchParams({ outletId: opts.outletId });
  if (opts.categoryId && opts.categoryId !== 'all') {
    params.set('categoryId', opts.categoryId);
  }
  if (opts.q?.trim()) {
    params.set('q', opts.q.trim());
  }
  const data = await storeFetch<{ items: CatalogProductItem[] }>(
    `/${slug}/catalog/products?${params.toString()}`,
  );
  return data.items;
}

export async function fetchProduct(
  slug: string,
  productId: string,
  outletId: string,
): Promise<CatalogProductItem & { description?: string }> {
  return storeFetch(`/${slug}/catalog/products/${productId}?outletId=${outletId}`);
}

export function toStoreProduct(item: CatalogProductItem, categoryId = 'all'): StoreProduct {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    unitSymbol: item.unitSymbol,
    price: item.price,
    imageUrl: item.imageUrl,
    placeholderKey: item.placeholderKey,
    categoryId,
    description: '',
    stockByOutlet: {},
    moq: item.moq,
    orderStep: item.orderStep,
    stockStatus: item.stockStatus,
  } as StoreProduct & { stockStatus?: string };
}

export function getStockStatusFromItem(item: CatalogProductItem): 'AVAILABLE' | 'OUT_OF_STOCK' {
  return item.stockStatus;
}

export async function createOrder(input: {
  slug: string;
  outletId: string;
  customer: CheckoutCustomer;
  items: CartLine[];
  clientRequestId: string;
  fulfillmentType?: StoreFulfillmentType;
  deliveryAddress?: DeliveryAddressInput;
  website?: string;
}): Promise<CreateOrderResult> {
  const fulfillmentType = input.fulfillmentType ?? 'PICKUP';
  return storeFetch<CreateOrderResult>(`/${input.slug}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      clientRequestId: input.clientRequestId,
      outletId: input.outletId,
      fulfillmentType,
      customer: input.customer,
      items: input.items.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
      })),
      ...(fulfillmentType === 'DELIVERY' && input.deliveryAddress
        ? { deliveryAddress: input.deliveryAddress }
        : {}),
      ...(input.website ? { website: input.website } : {}),
    }),
  });
}

export async function fetchOrderStatus(slug: string, orderNo: string, phone: string) {
  const params = new URLSearchParams({ phone });
  return storeFetch<{
    orderNo: string;
    status: string;
    statusLabel: string;
    fulfillmentType: StoreFulfillmentType;
    outletName: string;
    total: number;
    paidAt: string | null;
  }>(`/${slug}/orders/${orderNo}/status?${params.toString()}`);
}

/** Dev/UAT only — marks mock Midtrans payment as PAID (when API mock mode active). */
export async function confirmMockPayment(slug: string, orderNo: string, phone: string) {
  return storeFetch<{ ok: boolean; message: string; status?: string; statusLabel?: string }>(
    `/${slug}/orders/${orderNo}/mock-pay`,
    {
      method: 'POST',
      body: JSON.stringify({ phone }),
    },
    'Gagal mengonfirmasi pembayaran mock.',
  );
}

export async function registerStoreMember(
  slug: string,
  input: { name: string; phone: string; email?: string; website?: string },
) {
  return storeFetch<{
    customer: { id: string; name: string; phone: string; points: number };
    tenantName: string;
    message: string;
  }>(
    `/${slug}/register`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    'Pendaftaran member gagal.',
  );
}
