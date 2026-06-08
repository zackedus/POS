import type {
  DeliveryOrderDetail,
  DeliveryOrderListItem,
  DeliveryQueueSummary,
} from '@barokah/shared';
import { apiConfig } from './api';
import { authApiJson } from './api-client';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/deliveries`;

export interface PaginatedDeliveries {
  items: DeliveryOrderListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export async function fetchDeliveries(params: {
  outletId?: string;
  deliveryType?: string;
  channel?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedDeliveries> {
  const query = new URLSearchParams();
  if (params.outletId) query.set('outletId', params.outletId);
  if (params.deliveryType) query.set('deliveryType', params.deliveryType);
  if (params.channel) query.set('channel', params.channel);
  if (params.status) query.set('status', params.status);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return authApiJson<PaginatedDeliveries>(
    `${BASE}${qs ? `?${qs}` : ''}`,
    undefined,
    'Gagal memuat antrian pengiriman.',
  );
}

export async function fetchDeliveryQueueSummary(params?: {
  outletId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<DeliveryQueueSummary> {
  const query = new URLSearchParams();
  if (params?.outletId) query.set('outletId', params.outletId);
  if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params?.dateTo) query.set('dateTo', params.dateTo);
  const qs = query.toString();
  return authApiJson<DeliveryQueueSummary>(
    `${BASE}/queue/summary${qs ? `?${qs}` : ''}`,
    undefined,
    'Gagal memuat ringkasan pengiriman.',
  );
}

export async function fetchDeliveryShippingLabel(
  deliveryId: string,
  outletId?: string,
): Promise<import('./online-orders-api').ShippingLabelData> {
  const params = outletId ? `?outletId=${outletId}` : '';
  return authApiJson(
    `${BASE}/${deliveryId}/shipping-label${params}`,
    undefined,
    'Gagal menyiapkan label pengiriman.',
  );
}

export async function fetchDeliveryDetail(id: string, outletId?: string): Promise<DeliveryOrderDetail> {
  const params = outletId ? `?outletId=${outletId}` : '';
  return authApiJson<DeliveryOrderDetail>(
    `${BASE}/${id}${params}`,
    undefined,
    'Gagal memuat detail pengiriman.',
  );
}

export interface CreateDeliveryPayload {
  transactionId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryType?: 'STORE_DIRECT' | 'ONLINE_ORDER';
  addressId?: string;
  addressSnapshot?: {
    label: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    province?: string;
    postalCode?: string;
  };
  outletId?: string;
  scheduledAt?: string;
  driverName?: string;
  notes?: string;
}

export async function createDeliveryOrder(payload: CreateDeliveryPayload): Promise<DeliveryOrderListItem> {
  return authApiJson<DeliveryOrderListItem>(
    BASE,
    { method: 'POST', body: JSON.stringify(payload) },
    'Gagal membuat antrian pengiriman.',
  );
}

export async function updateDeliveryStatus(
  id: string,
  payload: {
    status: string;
    driverName?: string;
    scheduledAt?: string;
    notes?: string;
    cancelReason?: string;
  },
  outletId?: string,
): Promise<DeliveryOrderListItem> {
  const params = outletId ? `?outletId=${outletId}` : '';
  return authApiJson<DeliveryOrderListItem>(
    `${BASE}/${id}/status${params}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    'Gagal memperbarui status pengiriman.',
  );
}
