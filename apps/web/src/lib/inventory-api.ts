import { apiConfig } from './api';
import { authFetch } from './auth';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/inventory`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface InventoryRow {
  id: string;
  outletId: string;
  productId: string;
  sku: string;
  productName: string;
  displayName: string;
  variantLabel: string | null;
  parentProductName: string | null;
  hasVariants: boolean;
  categoryId: string | null;
  categoryName: string | null;
  unitSymbol: string | null;
  unitName: string | null;
  quantity: number;
  purchaseEquivalent?: {
    quantity: number;
    unitSymbol: string;
    unitName: string;
  } | null;
  minStock: number;
  isLowStock: boolean;
  isActive: boolean;
}

export interface InventoryListResponse {
  outletId: string;
  items: InventoryRow[];
  lowStockCount: number;
  totalCount: number;
}

export interface StockMovementRow {
  id: string;
  outletId: string;
  productId: string;
  sku: string;
  productName: string;
  displayName: string;
  type: string;
  typeLabel: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitSymbol: string | null;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface StockMovementsResponse {
  outletId: string;
  movements: StockMovementRow[];
}

export type StockAdjustReason =
  | 'OPNAME'
  | 'GIFT'
  | 'TRANSFER_IN'
  | 'DAMAGED'
  | 'SAMPLE'
  | 'TRANSFER_OUT'
  | 'OTHER';

export const STOCK_ADJUST_REASON_OPTIONS: Array<{ value: StockAdjustReason; label: string; direction: 'IN' | 'OUT' | 'BOTH' }> = [
  { value: 'GIFT', label: 'Hadiah / bonus masuk', direction: 'IN' },
  { value: 'TRANSFER_IN', label: 'Transfer masuk antar cabang', direction: 'IN' },
  { value: 'DAMAGED', label: 'Barang rusak', direction: 'OUT' },
  { value: 'SAMPLE', label: 'Sample / promosi', direction: 'OUT' },
  { value: 'TRANSFER_OUT', label: 'Transfer keluar antar cabang', direction: 'OUT' },
  { value: 'OTHER', label: 'Lainnya', direction: 'BOTH' },
];

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function fetchInventory(params?: {
  outletId?: string;
  lowStockOnly?: boolean;
  categoryId?: string;
  search?: string;
}): Promise<InventoryListResponse> {
  const search = new URLSearchParams();
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.lowStockOnly) search.set('lowStockOnly', 'true');
  if (params?.categoryId) search.set('categoryId', params.categoryId);
  if (params?.search?.trim()) search.set('search', params.search.trim());

  const qs = search.toString();
  const res = await authFetch(`${BASE}${qs ? `?${qs}` : ''}`);
  const json = await parseEnvelope<InventoryListResponse>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat stok.');
  }

  return json.data;
}

export async function fetchStockMovements(params?: {
  outletId?: string;
  productId?: string;
  type?: string;
  limit?: number;
}): Promise<StockMovementsResponse> {
  const search = new URLSearchParams();
  if (params?.outletId) search.set('outletId', params.outletId);
  if (params?.productId) search.set('productId', params.productId);
  if (params?.type) search.set('type', params.type);
  if (params?.limit) search.set('limit', String(params.limit));

  const qs = search.toString();
  const res = await authFetch(`${BASE}/movements${qs ? `?${qs}` : ''}`);
  const json = await parseEnvelope<StockMovementsResponse>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat stok.');
  }

  return json.data;
}

export async function adjustStock(body: {
  outletId?: string;
  productId: string;
  direction: 'IN' | 'OUT';
  quantity: number;
  reason?: StockAdjustReason;
  notes?: string;
}): Promise<void> {
  const res = await authFetch(`${BASE}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope(res);

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menyesuaikan stok.');
  }
}

export async function opnameStock(body: {
  outletId?: string;
  productId: string;
  actualQuantity: number;
  notes?: string;
}): Promise<{ changed: boolean }> {
  const res = await authFetch(`${BASE}/opname`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<{ changed: boolean }>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menyimpan opname.');
  }

  return json.data;
}

export async function transferStock(body: {
  fromOutletId?: string;
  toOutletId: string;
  productId: string;
  quantity: number;
  notes?: string;
}): Promise<{
  transferId: string;
  fromOutletId: string;
  toOutletId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  fromQuantityAfter: number;
  toQuantityAfter: number;
}> {
  const res = await authFetch(`${BASE}/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<{
    transferId: string;
    fromOutletId: string;
    toOutletId: string;
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    fromQuantityAfter: number;
    toQuantityAfter: number;
  }>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal transfer stok antar cabang.');
  }

  return json.data;
}

export async function updateMinStock(inventoryItemId: string, minStock: number): Promise<void> {
  const res = await authFetch(`${BASE}/${inventoryItemId}/min-stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minStock }),
  });
  const json = await parseEnvelope(res);

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui stok minimum.');
  }
}
