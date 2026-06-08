import { apiConfig } from './api';
import { authFetch } from './auth';
import type { PaymentReceiptView } from '@barokah/shared';

export interface DepositSummaryRow {
  id: string;
  customerId: string;
  balance: number;
  status: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string };
  lastActivityAt: string;
}

export interface DepositDetail {
  id: string;
  customerId: string;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string };
  ledger: Array<{
    id: string;
    type: 'TOP_UP' | 'APPLY' | 'REFUND';
    amount: number;
    balanceAfter: number;
    receiptNumber: string | null;
    referenceType: string | null;
    referenceId: string | null;
    notes: string | null;
    recordedBy: { id: string; fullName: string };
    createdAt: string;
  }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function fetchDeposits(customerId?: string): Promise<DepositSummaryRow[]> {
  const qs = customerId ? `?customerId=${encodeURIComponent(customerId)}` : '';
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/deposits${qs}`);
  const json = (await res.json()) as ApiEnvelope<DepositSummaryRow[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat deposit.');
  }
  return json.data;
}

export async function fetchDepositByCustomer(customerId: string): Promise<DepositDetail> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/deposits/customers/${customerId}`,
  );
  const json = (await res.json()) as ApiEnvelope<DepositDetail>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat deposit pelanggan.');
  }
  return json.data;
}

export async function topUpDeposit(body: {
  customerId: string;
  amount: number;
  notes?: string;
}): Promise<DepositDetail & { receipt: PaymentReceiptView }> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/deposits/top-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<DepositDetail & { receipt: PaymentReceiptView }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal top-up deposit.');
  }
  return json.data;
}

export async function refundDeposit(
  customerId: string,
  body: { amount: number; notes?: string },
): Promise<DepositDetail> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/deposits/customers/${customerId}/refund`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<DepositDetail>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal refund deposit.');
  }
  return json.data;
}

export const DEPOSIT_TYPE_LABELS = {
  TOP_UP: 'Top-up',
  APPLY: 'Pakai di transaksi',
  REFUND: 'Refund',
} as const;
