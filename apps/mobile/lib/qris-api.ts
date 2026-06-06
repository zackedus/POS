import { API_BASE } from './api';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function initiateMobileQris(
  accessToken: string,
  input: { items: Array<{ productId: string; quantity: number }>; promoRuleId?: string },
) {
  const clientRequestId = `mobile-qris-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const res = await fetch(`${API_BASE}/transactions/qris/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...input, clientRequestId }),
  });
  const json = (await res.json()) as ApiEnvelope<{
    paymentId: string;
    qrPayload: string;
    amount: number;
    status: string;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memulai QRIS mobile.');
  }
  return json.data;
}

export async function pollMobileQrisStatus(accessToken: string, paymentId: string) {
  const res = await fetch(`${API_BASE}/transactions/qris/${encodeURIComponent(paymentId)}/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as ApiEnvelope<{
    status: string;
    receiptNo: string | null;
    total: number | null;
    transactionId: string | null;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal polling QRIS.');
  }
  return json.data;
}

/** Deep link stub — opens mock QRIS screen in app. */
export function buildQrisDeepLink(paymentId: string): string {
  return `barokahpos://qris/${encodeURIComponent(paymentId)}`;
}
