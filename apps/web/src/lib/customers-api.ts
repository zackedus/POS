import { apiConfig } from './api';
import { authFetch } from './auth';

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  points: number;
  updatedAt: string;
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
