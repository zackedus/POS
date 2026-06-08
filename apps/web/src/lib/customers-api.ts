import { apiConfig } from './api';
import { authFetch } from './auth';

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  points: number;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  stats: {
    transactionCount: number;
    onlineOrderCount: number;
  };
  recentTransactions: Array<{
    id: string;
    receiptNo: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  recentOnlineOrders: Array<{
    id: string;
    orderNo: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function fetchCustomers(search?: string): Promise<CustomerListItem[]> {
  const query = search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/customers${query}`);
  const json = (await res.json()) as ApiEnvelope<{ customers: CustomerListItem[] }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat pelanggan.');
  }
  return json.data.customers;
}

export async function fetchCustomerDetail(customerId: string): Promise<CustomerDetail> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}`);
  const json = (await res.json()) as ApiEnvelope<CustomerDetail>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat detail pelanggan.');
  }
  return json.data;
}

export async function createCustomer(body: { name: string; phone: string }): Promise<CustomerListItem> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<CustomerListItem>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mendaftarkan pelanggan.');
  }
  return json.data;
}

export async function lookupCustomerByPhone(phone: string): Promise<CustomerListItem | null> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/lookup?phone=${encodeURIComponent(phone.trim())}`,
  );
  const json = (await res.json()) as ApiEnvelope<{ customer: CustomerListItem | null }>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal mencari pelanggan.');
  }
  return json.data?.customer ?? null;
}
