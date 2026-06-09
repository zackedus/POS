import { apiConfig } from './api';
import { authFetch } from './auth';
import type { PaginationMeta } from '@barokah/shared';
import { buildPaginationQuery, type PaginatedResult } from './pagination';

export type ExpenseCategory = 'OPERATIONAL' | 'LOADING_UNLOADING' | 'SHIPPING' | 'OTHER';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  OPERATIONAL: 'Onkos operasional',
  LOADING_UNLOADING: 'Bongkar muat',
  SHIPPING: 'Kirim barang',
  OTHER: 'Lainnya',
};

export interface ExpenseRow {
  id: string;
  tenantId: string;
  outletId: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expenseDate: string;
  createdById: string;
  createdBy: { id: string; fullName: string };
  outlet: { id: string; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseTodaySummary {
  date: string;
  total: number;
  count: number;
  byCategory: Record<ExpenseCategory, number>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export async function fetchExpenses(params?: {
  outletId?: string;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<ExpenseRow>> {
  const qs = buildPaginationQuery({
    page: params?.page,
    limit: params?.limit,
    extra: {
      outletId: params?.outletId,
      category: params?.category,
      dateFrom: params?.dateFrom,
      dateTo: params?.dateTo,
    },
  });
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/expenses${qs}`);
  const json = (await res.json()) as ApiEnvelope<{ items: ExpenseRow[]; meta: PaginationMeta }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat pengeluaran.');
  }
  return json.data;
}

export async function fetchExpenseTodaySummary(outletId?: string): Promise<ExpenseTodaySummary> {
  const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/expenses/summary/today${qs}`);
  const json = (await res.json()) as ApiEnvelope<ExpenseTodaySummary>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat ringkasan pengeluaran.');
  }
  return json.data;
}

export async function createExpense(payload: {
  outletId?: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  expenseDate: string;
}): Promise<ExpenseRow> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/expenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as ApiEnvelope<ExpenseRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menyimpan pengeluaran.');
  }
  return json.data;
}

export async function updateExpense(
  expenseId: string,
  payload: Partial<{
    outletId: string | null;
    category: ExpenseCategory;
    amount: number;
    description: string | null;
    expenseDate: string;
  }>,
): Promise<ExpenseRow> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/expenses/${expenseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as ApiEnvelope<ExpenseRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui pengeluaran.');
  }
  return json.data;
}
