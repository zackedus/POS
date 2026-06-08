import type {
  CustomerAddressView,
  LoyaltyPointLedgerEntry,
  MemberCardView,
} from '@barokah/shared';
import type { CustomerFinanceSummary } from './receivables-api';
import { apiConfig } from './api';
import { authFetch } from './auth';

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  memberCode?: string;
  points: number;
  updatedAt: string;
  creditLimit?: number | null;
  receivableOutstanding?: number;
  depositBalance?: number;
  creditAvailable?: number | null;
}

export interface CustomerDetail extends CustomerListItem {
  email?: string | null;
  memberSince?: string;
  notes?: string | null;
  stats: {
    transactionCount: number;
    onlineOrderCount: number;
    addressCount?: number;
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

export async function updateCustomer(
  customerId: string,
  body: {
    name?: string;
    phone?: string;
    email?: string | null;
    creditLimit?: number | null;
    notes?: string;
  },
): Promise<CustomerListItem> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<CustomerListItem>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui pelanggan.');
  }
  return json.data;
}

export async function createCustomer(body: {
  name: string;
  phone: string;
  email?: string;
}): Promise<CustomerListItem> {
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

export async function lookupCustomerByMemberCode(code: string): Promise<CustomerListItem | null> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/lookup/by-code?code=${encodeURIComponent(code.trim())}`,
  );
  const json = (await res.json()) as ApiEnvelope<{ customer: CustomerListItem | null }>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal mencari member.');
  }
  return json.data?.customer ?? null;
}

export async function fetchCustomerAddresses(customerId: string): Promise<CustomerAddressView[]> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/addresses`,
  );
  const json = (await res.json()) as ApiEnvelope<{ addresses: CustomerAddressView[] }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat alamat.');
  }
  return json.data.addresses;
}

export async function createCustomerAddress(
  customerId: string,
  body: Omit<CustomerAddressView, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<CustomerAddressView> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/addresses`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<CustomerAddressView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menambah alamat.');
  }
  return json.data;
}

export async function updateCustomerAddress(
  customerId: string,
  addressId: string,
  body: Partial<Omit<CustomerAddressView, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<CustomerAddressView> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/addresses/${addressId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<CustomerAddressView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui alamat.');
  }
  return json.data;
}

export async function deleteCustomerAddress(customerId: string, addressId: string): Promise<void> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/addresses/${addressId}`,
    { method: 'DELETE' },
  );
  const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menghapus alamat.');
  }
}

export async function fetchCustomerLoyaltyLedger(
  customerId: string,
  page = 1,
): Promise<{ balance: number; entries: LoyaltyPointLedgerEntry[]; meta: { page: number; limit: number; total: number } }> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/loyalty-ledger?page=${page}`,
  );
  const json = (await res.json()) as ApiEnvelope<{
    balance: number;
    entries: LoyaltyPointLedgerEntry[];
    meta: { page: number; limit: number; total: number };
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat poin.');
  }
  return json.data;
}

export async function fetchCustomerFinanceSummaryFromCustomers(
  customerId: string,
): Promise<CustomerFinanceSummary> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/finance-summary`,
  );
  const json = (await res.json()) as ApiEnvelope<CustomerFinanceSummary>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat ringkasan keuangan.');
  }
  return json.data;
}

export async function fetchMemberCard(customerId: string): Promise<MemberCardView> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/member-card`,
  );
  const json = (await res.json()) as ApiEnvelope<MemberCardView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat kartu member.');
  }
  return json.data;
}

export async function regenerateMemberCode(customerId: string): Promise<MemberCardView> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/member-card/regenerate-code`,
    { method: 'POST' },
  );
  const json = (await res.json()) as ApiEnvelope<MemberCardView>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui kode member.');
  }
  return json.data;
}
