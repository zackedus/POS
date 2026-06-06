import { apiConfig } from '@/lib/api';
import { authApiJson } from '@/lib/api-client';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/online-orders`;

export interface FulfillmentOrder {
  id: string;
  orderNo: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: string;
  fulfillmentTypeLabel: string;
  deliveryAddressSnippet: string | null;
  shippingFee: number;
  total: number;
  itemCount: number;
  notes: string | null;
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
  outlet: { id: string; name: string; address: string };
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

export async function fetchFulfillmentQueue(outletId?: string): Promise<FulfillmentOrder[]> {
  const params = outletId ? `?outletId=${outletId}` : '';
  const data = await authApiJson<PaginatedOrders>(
    `${BASE}/fulfillment${params}`,
    undefined,
    'Gagal memuat antrian order online.',
  );
  return data.items;
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
  const params = outletId ? `?outletId=${outletId}` : '';
  return authApiJson<OrderDetail>(
    `${BASE}/${orderId}${params}`,
    undefined,
    'Gagal memuat detail pesanan.',
  );
}

export async function updateOrderStatus(
  orderId: string,
  status: 'CONFIRMED' | 'READY' | 'COMPLETED',
  outletId?: string,
) {
  const params = outletId ? `?outletId=${outletId}` : '';
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
