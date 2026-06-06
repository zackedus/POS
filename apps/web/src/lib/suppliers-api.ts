import { apiConfig } from './api';
import { authFetch } from './auth';

const API = `${apiConfig.baseUrl}/${apiConfig.prefix}`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface SupplierRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'ORDERED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED';

export interface PurchaseOrderSummary {
  id: string;
  orderNo: string;
  status: PurchaseOrderStatus;
  supplierId: string;
  supplierName: string;
  notes: string | null;
  orderedAt: string | null;
  expectedDeliveryAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  itemCount: number;
  subtotal: number;
}

export interface PurchaseOrderItemRow {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unitId: string | null;
  unitSymbol: string | null;
  baseUnitSymbol: string | null;
  conversionToBase: number;
  orderedQuantity: number;
  receivedQuantity: number;
  returnedQuantity: number;
  remainingQuantity: number;
  returnableQuantity: number;
  unitCost: number;
  lineTotal: number;
  currentCostPrice: number;
}

export type PurchaseOrderReturnReason = 'DAMAGED' | 'WRONG_ITEM' | 'EXCESS' | 'OTHER';

export const PO_RETURN_REASON_LABELS: Record<PurchaseOrderReturnReason, string> = {
  DAMAGED: 'Rusak',
  WRONG_ITEM: 'Salah Kirim',
  EXCESS: 'Kelebihan',
  OTHER: 'Lainnya',
};

export interface PurchaseOrderReturnLineRow {
  id: string;
  sku: string;
  productName: string;
  unitSymbol: string | null;
  baseUnitSymbol: string | null;
  quantityReturned: number;
  baseQuantityRemoved: number;
  reason: PurchaseOrderReturnReason;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrderReturnDetail {
  id: string;
  returnNo: string;
  status: 'COMPLETED';
  purchaseOrderId: string;
  orderNo: string;
  notes: string | null;
  returnedAt: string;
  createdAt: string;
  createdByName: string;
  outlet: { id: string; name: string; code: string; address: string | null };
  supplier: SupplierRow;
  subtotal: number;
  lines: PurchaseOrderReturnLineRow[];
  print: {
    returnNo: string;
    orderNo: string;
    returnedAt: string;
    outletName: string;
    outletAddress: string | null;
    supplierName: string;
    supplierPhone: string | null;
    supplierEmail: string | null;
    supplierAddress: string | null;
    notes: string | null;
    subtotal: number;
    items: Array<{
      sku: string;
      productName: string;
      quantity: number;
      unitSymbol: string | null;
      reason: PurchaseOrderReturnReason;
      unitCost: number;
      lineTotal: number;
    }>;
  };
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  outlet: { id: string; name: string; code: string; address: string | null };
  supplier: SupplierRow;
  cancelledAt: string | null;
  updatedAt: string;
  createdByName: string;
  submittedByName: string | null;
  items: PurchaseOrderItemRow[];
  receipts: Array<{
    id: string;
    receivedAt: string;
    notes: string | null;
    createdByName: string;
    lines: Array<{
      sku: string;
      productName: string;
      quantityReceived: number;
      unitCost: number;
      baseQuantityAdded: number;
      baseCostApplied: number;
    }>;
  }>;
  returns: Array<{
    id: string;
    returnNo: string;
    returnedAt: string;
    notes: string | null;
    createdByName: string;
    subtotal: number;
    lines: Array<{
      sku: string;
      productName: string;
      quantityReturned: number;
      reason: PurchaseOrderReturnReason;
      unitCost: number;
      lineTotal: number;
      baseQuantityRemoved: number;
    }>;
  }>;
  print: {
    orderNo: string;
    orderedAt: string | null;
    expectedDeliveryAt: string | null;
    outletName: string;
    outletAddress: string | null;
    supplierName: string;
    supplierPhone: string | null;
    supplierEmail: string | null;
    supplierAddress: string | null;
    notes: string | null;
    subtotal: number;
    items: Array<{
      sku: string;
      productName: string;
      quantity: number;
      unitSymbol: string | null;
      unitCost: number;
      lineTotal: number;
    }>;
  };
}

export interface PurchaseReceiveRow {
  id: string;
  outletId: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  notes: string | null;
  createdByName: string;
  createdAt: string;
}

export const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Dikirim ke Distributor',
  PARTIALLY_RECEIVED: 'Sebagian Diterima',
  RECEIVED: 'Diterima Lengkap',
  CANCELLED: 'Dibatalkan',
};

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function fetchSuppliers(): Promise<SupplierRow[]> {
  const res = await authFetch(`${API}/suppliers`);
  const json = await parseEnvelope<SupplierRow[]>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat supplier.');
  }

  return json.data;
}

export async function createSupplier(body: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}): Promise<SupplierRow> {
  const res = await authFetch(`${API}/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<SupplierRow>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menambah supplier.');
  }

  return json.data;
}

export async function updateSupplier(
  supplierId: string,
  body: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    isActive?: boolean;
  },
): Promise<SupplierRow> {
  const res = await authFetch(`${API}/suppliers/${supplierId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<SupplierRow>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui supplier.');
  }

  return json.data;
}

export async function fetchPurchaseOrders(outletId?: string): Promise<PurchaseOrderSummary[]> {
  const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  const res = await authFetch(`${API}/purchase-orders${qs}`);
  const json = await parseEnvelope<PurchaseOrderSummary[]>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat order distributor.');
  }

  return json.data;
}

export async function fetchPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}`);
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat detail order.');
  }

  return json.data;
}

export async function createPurchaseOrder(body: {
  outletId?: string;
  supplierId: string;
  notes?: string;
  expectedDeliveryAt?: string;
  items: Array<{ productId: string; quantity: number; unitId?: string; unitCost: number }>;
}): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat order distributor.');
  }

  return json.data;
}

export async function updatePurchaseOrder(
  purchaseOrderId: string,
  body: {
    supplierId?: string;
    notes?: string;
    expectedDeliveryAt?: string | null;
    items?: Array<{ productId: string; quantity: number; unitId?: string; unitCost: number }>;
  },
): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui order.');
  }

  return json.data;
}

export async function submitPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/submit`, {
    method: 'POST',
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal mengirim order ke distributor.');
  }

  return json.data;
}

export async function cancelPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/cancel`, {
    method: 'POST',
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membatalkan order.');
  }

  return json.data;
}

export async function receivePurchaseOrder(
  purchaseOrderId: string,
  body: {
    receivedAt?: string;
    notes?: string;
    items: Array<{ purchaseOrderItemId: string; quantityReceived: number; unitCost?: number }>;
  },
): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menerima barang.');
  }

  return json.data;
}

export async function fetchPurchaseOrderReturns(
  purchaseOrderId: string,
): Promise<PurchaseOrderReturnDetail[]> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/returns`);
  const json = await parseEnvelope<PurchaseOrderReturnDetail[]>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat retur.');
  }

  return json.data;
}

export async function fetchPurchaseOrderReturn(returnId: string): Promise<PurchaseOrderReturnDetail> {
  const res = await authFetch(`${API}/purchase-order-returns/${returnId}`);
  const json = await parseEnvelope<PurchaseOrderReturnDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat detail retur.');
  }

  return json.data;
}

export async function createPurchaseOrderReturn(
  purchaseOrderId: string,
  body: {
    returnedAt?: string;
    notes?: string;
    items: Array<{
      purchaseOrderItemId: string;
      quantityReturned: number;
      reason: PurchaseOrderReturnReason;
    }>;
  },
): Promise<PurchaseOrderReturnDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/returns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<PurchaseOrderReturnDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membuat retur barang.');
  }

  return json.data;
}

export async function cancelRemainingPurchaseOrder(
  purchaseOrderId: string,
): Promise<PurchaseOrderDetail> {
  const res = await authFetch(`${API}/purchase-orders/${purchaseOrderId}/cancel-remaining`, {
    method: 'POST',
  });
  const json = await parseEnvelope<PurchaseOrderDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal membatalkan sisa order.');
  }

  return json.data;
}

export async function fetchPurchaseReceives(outletId?: string): Promise<PurchaseReceiveRow[]> {
  const qs = outletId ? `?outletId=${encodeURIComponent(outletId)}` : '';
  const res = await authFetch(`${API}/purchase-orders/receives${qs}`);
  const json = await parseEnvelope<PurchaseReceiveRow[]>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat riwayat penerimaan.');
  }

  return json.data;
}

export async function receivePurchase(body: {
  outletId?: string;
  supplierId: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; unitId?: string; unitCost?: number }>;
}): Promise<void> {
  const res = await authFetch(`${API}/purchase-orders/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope(res);

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menerima barang dari supplier.');
  }
}

export function poStatusVariant(
  status: PurchaseOrderStatus,
): 'success' | 'warning' | 'error' | 'neutral' | 'info' {
  switch (status) {
    case 'RECEIVED':
      return 'success';
    case 'PARTIALLY_RECEIVED':
      return 'warning';
    case 'ORDERED':
      return 'info';
    case 'CANCELLED':
      return 'error';
    default:
      return 'neutral';
  }
}

export function formatPoDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
