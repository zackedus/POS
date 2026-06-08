import { apiConfig } from './api';
import { authFetch } from './auth';
import type { PaymentReceiptView } from '@barokah/shared';

export type PayableStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID';

export interface PayableRow {
  id: string;
  supplierId: string;
  poId: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: PayableStatus;
  isOverdue: boolean;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  supplier?: { id: string; name: string; phone?: string | null };
  purchaseOrder?: { id: string; orderNo: string; status: string; receivedAt?: string | null };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function fetchPayables(params?: {
  supplierId?: string;
  outletId?: string;
  status?: string;
}): Promise<PayableRow[]> {
  const search = new URLSearchParams();
  if (params?.supplierId) search.set('supplierId', params.supplierId);
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/payables${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<PayableRow[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat utang.');
  }
  return json.data;
}

export async function recordPayablePayment(
  payableId: string,
  body: { amount: number; method: string; reference?: string },
): Promise<PayableRow & { receipt: PaymentReceiptView }> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/payables/${payableId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<PayableRow & { receipt: PaymentReceiptView }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mencatat pembayaran utang.');
  }
  return json.data;
}

export async function createPayableFromPo(
  purchaseOrderId: string,
  body?: { dueDate?: string; notes?: string },
): Promise<PayableRow> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/payables/from-po/${purchaseOrderId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    },
  );
  const json = (await res.json()) as ApiEnvelope<PayableRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat utang dari PO.');
  }
  return json.data;
}

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  OPEN: 'Belum bayar',
  PARTIAL: 'Sebagian',
  PAID: 'Lunas',
  VOID: 'Batal',
};
