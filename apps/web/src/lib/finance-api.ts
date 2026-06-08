import type { CustomerStatement, FinanceSummary, ReceivableAgingReport } from '@barokah/shared';
import { apiConfig } from './api';
import { authFetch } from './auth';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
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

export type { FinanceSummary, ReceivableAgingReport, CustomerStatement };
