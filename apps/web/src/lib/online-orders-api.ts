import { apiConfig } from '@/lib/api';
import { authApiJson } from '@/lib/api-client';
import { MARKETPLACE_ORDER_CHANNELS } from '@barokah/shared';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/online-orders`;

export interface OnlineOrderDeliveryRef {
  id: string;
  deliveryNo: string;
  status: string;
  statusLabel: string;
}

export interface FulfillmentOrderItem {
  productName: string;
  quantity: number;
  sku: string;
}

export interface FulfillmentOrder {
  id: string;
  orderNo: string;
  channel: string;
  channelLabel: string;
  externalOrderRef: string | null;
  status: string;
  statusLabel: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: string;
  fulfillmentTypeLabel: string;
  deliveryAddressSnippet: string | null;
  deliveryAddressFull: string | null;
  shippingFee: number;
  total: number;
  itemCount: number;
  notes: string | null;
  items: FulfillmentOrderItem[];
  delivery: OnlineOrderDeliveryRef | null;
}

export interface PaginatedOrders {
  items: FulfillmentOrder[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface OrderDetail {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  fulfillmentType: string;
  customerName: string;
  customerPhone: string;
  customerNotes: string | null;
  deliveryAddress: unknown;
  deliveryAddressFull: string | null;
  shippingFee: number;
  tenantName: string;
  outlet: { id: string; name: string; address: string; phone: string | null };
  delivery: OnlineOrderDeliveryRef | null;
  subtotal: number;
  tax: number;
  total: number;
  paidAt: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

export interface ShippingLabelData {
  orderNo: string;
  orderDate: string;
  serviceName: string;
  deliveryTypeLabel: string;
  from: {
    storeName: string;
    outletName: string;
    address: string;
    phone: string | null;
  };
  to: {
    name: string;
    phone: string;
    address: string;
  };
  delivery: {
    deliveryNo: string;
    status: string;
    statusLabel: string;
  } | null;
  items: Array<{ productName: string; quantity: number; sku: string }>;
  notes: string | null;
}

export type FulfillmentChannelFilter = 'WEB' | typeof MARKETPLACE_ORDER_CHANNELS;

export async function fetchFulfillmentQueue(
  outletId?: string,
  channel?: FulfillmentChannelFilter,
): Promise<FulfillmentOrder[]> {
  const params = new URLSearchParams();
  if (outletId) params.set('outletId', outletId);
  if (channel) params.set('channel', channel);
  const qs = params.toString();
  const data = await authApiJson<PaginatedOrders>(
    `${BASE}/fulfillment${qs ? `?${qs}` : ''}`,
    undefined,
    'Gagal memuat antrian order online.',
  );
  return data.items;
}

export interface CreateMarketplaceOrderPayload {
  outletId: string;
  clientRequestId: string;
  channel: 'TOKOPEDIA' | 'SHOPEE' | 'OTHER';
  externalOrderRef: string;
  customerName: string;
  customerPhone: string;
  customerNotes?: string;
  fulfillmentType: 'PICKUP' | 'DELIVERY';
  deliveryAddress?: {
    street: string;
    district: string;
    city: string;
    postalCode?: string;
  };
  items: Array<{ productId: string; quantity: number }>;
}

export async function createMarketplaceOrder(
  payload: CreateMarketplaceOrderPayload,
): Promise<FulfillmentOrder> {
  return authApiJson<FulfillmentOrder>(
    `${BASE}/marketplace`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Gagal mencatat order marketplace.',
  );
}

export async function fetchManagerOrders(params: {
  outletId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedOrders> {
  const query = new URLSearchParams();
  if (params.outletId) query.set('outletId', params.outletId);
  if (params.status) query.set('status', params.status);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return authApiJson<PaginatedOrders>(
    `${BASE}/manager${qs ? `?${qs}` : ''}`,
    undefined,
    'Gagal memuat daftar pesanan online.',
  );
}

export async function fetchOrderDetail(orderId: string, outletId?: string): Promise<OrderDetail> {
  const params = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  return authApiJson<OrderDetail>(
    `${BASE}/${orderId}${params}`,
    undefined,
    'Gagal memuat detail pesanan.',
  );
}

export async function fetchShippingLabel(orderId: string, outletId?: string): Promise<ShippingLabelData> {
  const params = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  return authApiJson<ShippingLabelData>(
    `${BASE}/${orderId}/shipping-label${params}`,
    undefined,
    'Gagal memuat data label pengiriman.',
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: 'CONFIRMED' | 'READY' | 'COMPLETED',
  outletId?: string,
) {
  const params = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  return authApiJson(
    `${BASE}/${orderId}/status${params}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'Gagal memperbarui status order.',
  );
}

export async function shipOnlineOrder(orderId: string, outletId?: string) {
  const params = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  return authApiJson(
    `${BASE}/${orderId}/ship${params}`,
    { method: 'POST' },
    'Gagal menandai order dikirim.',
  );
}
