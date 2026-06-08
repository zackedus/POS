import type { CustomerStatement, FinanceSummary, ReceivableAgingReport } from '@barokah/shared';
import { apiConfig } from './api';
import { authFetch } from './auth';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string };
}

export async function fetchFinanceSummary(params?: {
  outletId?: string;
  date?: string;
}): Promise<FinanceSummary> {
  const search = new URLSearchParams();
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.date) search.set('date', params.date);
  const qs = search.toString();
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/finance/summary${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<FinanceSummary>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat ringkasan keuangan.');
  }
  return json.data;
}

export async function sendOverdueReminders(outletId?: string): Promise<{ queued: number; message: string }> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/finance/overdue-reminders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outletId }),
  });
  const json = (await res.json()) as ApiEnvelope<{ queued: number; message: string }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mengirim pengingat.');
  }
  return json.data;
}

export interface CreditApprovalResult {
  approvalToken: string;
  expiresAt: string;
  approvedById: string;
}

export async function requestCreditApproval(body: {
  customerId: string;
  creditAmount: number;
  outletId?: string;
  managerEmail?: string;
  managerPassword?: string;
}): Promise<CreditApprovalResult> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/finance/credit-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<CreditApprovalResult>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mendapatkan persetujuan manager.');
  }
  return json.data;
}

export interface CustomerCreditAuditEntry {
  id: string;
  action: string;
  oldLimit: number | null;
  newLimit: number | null;
  amount: number | null;
  transactionId: string | null;
  receiptNo: string | null;
  approvedBy: { id: string; fullName: string } | null;
  recordedBy: { id: string; fullName: string } | null;
  notes: string | null;
  createdAt: string;
}

export async function fetchCustomerCreditAuditLog(
  customerId: string,
  page = 1,
): Promise<{
  entries: CustomerCreditAuditEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/credit-audit-log?page=${page}`,
  );
  const json = (await res.json()) as ApiEnvelope<{
    entries: CustomerCreditAuditEntry[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat limit kredit.');
  }
  return json.data;
}

export async function patchCustomerCreditLimit(
  customerId: string,
  body: {
    creditLimit?: number | null;
    autoLimitEnabled?: boolean;
    notes?: string;
  },
) {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/customers/${customerId}/credit-limit`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<Record<string, unknown>>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui limit kredit.');
  }
  return json.data;
}

export type { FinanceSummary, ReceivableAgingReport, CustomerStatement };
