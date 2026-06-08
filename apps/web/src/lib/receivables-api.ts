import { apiConfig } from './api';
import { authFetch } from './auth';

export type ReceivableStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID';

export interface ReceivableRow {
  id: string;
  customerId: string;
  outletId: string | null;
  transactionId: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: ReceivableStatus;
  isOverdue: boolean;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  customer?: { id: string; name: string; phone: string; creditLimit?: number | null };
  outlet?: { id: string; code: string; name: string };
  transaction?: { id: string; receiptNo: string; total?: number; createdAt?: string };
}

export interface CustomerFinanceSummary {
  customer: {
    id: string;
    name: string;
    phone: string;
    creditLimit: number | null;
  };
  finance: {
    receivableOutstanding: number;
    depositBalance: number;
    creditLimit: number | null;
    creditAvailable: number | null;
  } | null;
  receivables: ReceivableRow[];
  deposit: {
    id: string;
    balance: number;
    status: string;
    recentLedger: Array<{
      id: string;
      type: string;
      amount: number;
      balanceAfter: number;
      notes: string | null;
      createdAt: string;
    }>;
  } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function fetchReceivables(params?: {
  customerId?: string;
  outletId?: string;
  status?: string;
}): Promise<ReceivableRow[]> {
  const search = new URLSearchParams();
  if (params?.customerId) search.set('customerId', params.customerId);
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<ReceivableRow[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat piutang.');
  }
  return json.data;
}

export async function fetchReceivableDetail(receivableId: string): Promise<ReceivableRow> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/${receivableId}`);
  const json = (await res.json()) as ApiEnvelope<ReceivableRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat detail piutang.');
  }
  return json.data;
}

export async function recordReceivablePayment(
  receivableId: string,
  body: { amount: number; method: string; reference?: string },
): Promise<ReceivableRow> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/${receivableId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<ReceivableRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mencatat pembayaran piutang.');
  }
  return json.data;
}

export async function fetchCustomerFinanceSummary(customerId: string): Promise<CustomerFinanceSummary> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/customers/${customerId}/summary`,
  );
  const json = (await res.json()) as ApiEnvelope<CustomerFinanceSummary>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat ringkasan keuangan pelanggan.');
  }
  return json.data;
}

export async function updateCustomerCreditLimit(
  customerId: string,
  creditLimit: number | null,
): Promise<{ creditLimit: number | null }> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/customers/${customerId}/credit-limit`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creditLimit }),
    },
  );
  const json = (await res.json()) as ApiEnvelope<{ creditLimit: number | null }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui limit kredit.');
  }
  return json.data;
}

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  OPEN: 'Belum bayar',
  PARTIAL: 'Sebagian',
  PAID: 'Lunas',
  VOID: 'Batal',
};
