import type {
  CustomerReceivablePaymentHistory,
  CustomerStatement,
  ReceivableAgingReport,
  PaymentReceiptView,
  ReceivablePaymentView,
} from '@barokah/shared';
export type { ReceivableAgingReport } from '@barokah/shared';
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

export async function fetchOverdueReceivables(params?: {
  outletId?: string;
}): Promise<ReceivableRow[]> {
  const search = new URLSearchParams();
  if (params?.outletId) search.set('outletId', params.outletId);
  const qs = search.toString();
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/overdue${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<ReceivableRow[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat piutang jatuh tempo.');
  }
  return json.data;
}

export async function fetchReceivableAging(params?: {
  outletId?: string;
  groupByCustomer?: boolean;
}): Promise<ReceivableAgingReport> {
  const search = new URLSearchParams();
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.groupByCustomer) search.set('groupByCustomer', 'true');
  const qs = search.toString();
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/aging${qs ? `?${qs}` : ''}`);
  const json = (await res.json()) as ApiEnvelope<ReceivableAgingReport>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat laporan aging piutang.');
  }
  return json.data;
}

export async function fetchCustomerStatement(
  customerId: string,
  params: { from: string; to: string },
): Promise<CustomerStatement> {
  const search = new URLSearchParams({ from: params.from, to: params.to });
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/customers/${customerId}/statement?${search}`,
  );
  const json = (await res.json()) as ApiEnvelope<CustomerStatement>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat statement pelanggan.');
  }
  return json.data;
}

export function exportAgingCsv(report: ReceivableAgingReport): void {
  const lines: string[] = [];
  if (report.groupByCustomer && report.byCustomer) {
    lines.push('Pelanggan,Telepon,Total Outstanding,Belum Jatuh Tempo,1-30 hari,31-60 hari,61-90 hari,90+ hari');
    for (const row of report.byCustomer) {
      const amounts = row.buckets.map((b) => b.amount);
      lines.push(
        [
          `"${row.customerName.replace(/"/g, '""')}"`,
          row.customerPhone,
          row.totalOutstanding,
          ...amounts,
        ].join(','),
      );
    }
  } else if (report.rows) {
    lines.push('Pelanggan,Telepon,Outlet,Sisa,Jatuh Tempo,Hari Terlambat,Bucket');
    for (const row of report.rows) {
      lines.push(
        [
          `"${row.customerName.replace(/"/g, '""')}"`,
          row.customerPhone,
          `"${(row.outletName ?? '—').replace(/"/g, '""')}"`,
          row.outstanding,
          row.dueDate ?? '',
          row.daysOverdue,
          row.bucket,
        ].join(','),
      );
    }
  }
  lines.push('');
  lines.push('Ringkasan Bucket,Jumlah Tagihan,Total (IDR)');
  for (const t of report.totals) {
    lines.push([t.label, t.count, t.amount].join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aging-piutang-${report.asOf}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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

export async function createReceivable(body: {
  customerId: string;
  amount: number;
  outletId?: string;
  dueDate?: string;
  notes?: string;
}): Promise<ReceivableRow> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<ReceivableRow>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat piutang.');
  }
  return json.data;
}

export type RecordReceivablePaymentBody = {
  amount: number;
  method: string;
  reference?: string;
  transferReference?: string;
  bankName?: string;
  proofUrl?: string;
  notes?: string;
  shiftId?: string;
  receivableId?: string;
};

export async function recordReceivablePayment(
  receivableId: string,
  body: RecordReceivablePaymentBody,
): Promise<ReceivableRow & { receipt: PaymentReceiptView }> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/${receivableId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiEnvelope<ReceivableRow & { receipt: PaymentReceiptView }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mencatat pembayaran piutang.');
  }
  return json.data;
}

export async function recordCustomerReceivablePayment(
  customerId: string,
  body: RecordReceivablePaymentBody,
): Promise<CustomerReceivablePaymentHistory & { receipt: PaymentReceiptView }> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/customers/${customerId}/payments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const json = (await res.json()) as ApiEnvelope<
    CustomerReceivablePaymentHistory & { receipt: PaymentReceiptView }
  >;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mencatat pembayaran piutang pelanggan.');
  }
  return json.data;
}

export async function fetchCustomerPaymentHistory(
  customerId: string,
): Promise<CustomerReceivablePaymentHistory> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/customers/${customerId}/payment-history`,
  );
  const json = (await res.json()) as ApiEnvelope<CustomerReceivablePaymentHistory>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat pembayaran piutang.');
  }
  return json.data;
}

export async function fetchReceivablePayments(receivableId: string): Promise<ReceivablePaymentView[]> {
  const res = await authFetch(
    `${apiConfig.baseUrl}/${apiConfig.prefix}/receivables/${receivableId}/payments`,
  );
  const json = (await res.json()) as ApiEnvelope<ReceivablePaymentView[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat pembayaran piutang.');
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
