import { apiConfig } from './api';
import { authFetch } from './auth';

export type QrisPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface QrisInitiateResult {
  paymentId: string;
  status: QrisPaymentStatus;
  amount: number;
  qrPayload: string;
  mockAutoConfirmMs: number;
  expiresAt: string;
  transactionId?: string;
  receiptNo?: string;
  total?: number;
}

export interface QrisStatusResult {
  paymentId: string;
  status: QrisPaymentStatus;
  amount: number;
  qrPayload: string;
  transactionId: string | null;
  receiptNo: string | null;
  total: number | null;
  expiresAt: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string };
}

export async function initiateQrisPayment(input: {
  items: Array<{ productId: string; quantity: number; sellUnitId?: string }>;
  clientRequestId?: string;
  promoRuleId?: string;
  outletId?: string;
}): Promise<QrisInitiateResult> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/qris/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(input.outletId ? { outletId: input.outletId } : {}),
      items: input.items,
      ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
      ...(input.promoRuleId ? { promoRuleId: input.promoRuleId } : {}),
    }),
  });
  const json = (await res.json()) as ApiEnvelope<QrisInitiateResult>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memulai pembayaran QRIS.');
  }
  return json.data;
}

export async function pollQrisStatus(paymentId: string): Promise<QrisStatusResult> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/qris/${encodeURIComponent(paymentId)}/status`,
  );
  const json = (await res.json()) as ApiEnvelope<QrisStatusResult>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memeriksa status QRIS.');
  }
  return json.data;
}

export async function confirmQrisMockPayment(paymentId: string): Promise<QrisStatusResult> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/transactions/qris/${encodeURIComponent(paymentId)}/confirm-mock`,
    { method: 'POST' },
  );
  const json = (await res.json()) as ApiEnvelope<QrisStatusResult>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal konfirmasi mock QRIS.');
  }
  return json.data;
}

export function buildQrisDisplayString(qrPayload: string): string {
  return qrPayload;
}
