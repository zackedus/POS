import { apiConfig } from './api';
import { authFetch } from './auth';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export interface RecentTransactionSummary {
  id: string;
  receiptNo: string;
  total: number;
  status: string;
  completedAt: string | null;
  cashierName: string;
}

export interface ReceiptLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ReceiptPaymentLine {
  method: string;
  amount: number;
  reference: string | null;
}

export interface ReceiptAdjustmentSummary {
  id: string;
  type: 'VOID' | 'REFUND';
  amount: number;
  reason: string;
  createdAt: string;
}

export interface DigitalReceipt {
  receiptNo: string;
  transactionId: string;
  outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  tenantName: string;
  cashier: { id: string; fullName: string };
  status: string;
  items: ReceiptLineItem[];
  payments: ReceiptPaymentLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  completedAt: string | null;
  adjustments: ReceiptAdjustmentSummary[];
  refundedTotal: number;
  netTotal: number;
}

export interface EscPosStub {
  format: 'escpos';
  encoding: 'base64';
  width: number;
  payload: string;
  commands: string[];
}

export interface ReceiptResponse {
  receipt: DigitalReceipt;
  escpos: EscPosStub;
}

export interface VoidTransactionRequest {
  reason: string;
  outletId?: string;
  managerEmail?: string;
  managerPassword?: string;
}

export interface VoidTransactionResult {
  transactionId: string;
  receiptNo: string;
  status: 'VOID';
  adjustment: {
    id: string;
    type: 'VOID';
    amount: number;
    reason: string;
    approvedById: string | null;
    createdAt: string;
  };
}

export class TransactionApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
    this.name = 'TransactionApiError';
  }
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || !json.success || json.data === undefined) {
    throw new TransactionApiError(json.error?.message ?? 'Permintaan transaksi gagal.', json.error?.code);
  }
  return json.data;
}

const base = `${apiConfig.baseUrl}/${apiConfig.prefix}/transactions`;

export async function fetchRecentTransactions(options?: {
  limit?: number;
  outletId?: string;
  status?: 'COMPLETED' | 'VOID' | 'ALL';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<RecentTransactionSummary[]> {
  const params = new URLSearchParams();
  params.set('limit', String(options?.limit ?? 25));
  if (options?.outletId) params.set('outletId', options.outletId);
  if (options?.status) params.set('status', options.status);
  if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options?.dateTo) params.set('dateTo', options.dateTo);
  if (options?.search?.trim()) params.set('search', options.search.trim());
  const res = await authFetch(`${base}/recent?${params.toString()}`);
  return parseEnvelope<RecentTransactionSummary[]>(res);
}

export async function fetchTransactionReceipt(transactionId: string): Promise<ReceiptResponse> {
  const res = await authFetch(`${base}/${transactionId}/receipt`);
  return parseEnvelope<ReceiptResponse>(res);
}

export async function voidTransaction(
  transactionId: string,
  body: VoidTransactionRequest,
): Promise<VoidTransactionResult> {
  const res = await authFetch(`${base}/${transactionId}/void`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseEnvelope<VoidTransactionResult>(res);
}

export function getVoidErrorMessage(code?: string, fallback?: string): string {
  if (code === 'INVALID_CREDENTIALS') {
    return 'Email atau password manager salah. Periksa kredensial lalu coba lagi.';
  }
  if (code === 'INVALID_INPUT') {
    return fallback ?? 'Data void belum lengkap. Isi alasan dan persetujuan manager.';
  }
  if (code === 'TRANSACTION_ALREADY_CLOSED') {
    return fallback ?? 'Transaksi tidak dapat di-void pada status saat ini.';
  }
  if (code === 'CONFLICT') {
    return fallback ?? 'Transaksi sudah memiliki void/refund.';
  }
  if (code === 'INSUFFICIENT_PERMISSION') {
    return 'Anda tidak memiliki izin void untuk transaksi ini.';
  }
  return fallback ?? 'Void transaksi gagal. Silakan coba lagi.';
}
