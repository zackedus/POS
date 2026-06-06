import { apiConfig } from './api';
import { authFetch } from './auth';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/outlets`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface OutletRecord {
  id: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  operatingHours: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inventorySkuCount?: number;
  assignedUserCount?: number;
}

export interface OutletDetail extends OutletRecord {
  stockSummary: {
    skuCount: number;
    totalQuantity: number;
    lowStockCount: number;
  };
  assignedUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
}

export interface OutletsListResponse {
  outlets: OutletRecord[];
  requiresOutletSelection: boolean;
  defaultOutletId: string | null;
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function fetchOutletsList(includeInactive = false): Promise<OutletsListResponse> {
  const qs = includeInactive ? '?includeInactive=true' : '';
  const res = await authFetch(`${BASE}${qs}`);
  const json = await parseEnvelope<OutletsListResponse>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat daftar cabang.');
  }

  return json.data;
}

export async function fetchOutletDetail(outletId: string): Promise<OutletDetail> {
  const res = await authFetch(`${BASE}/${outletId}`);
  const json = await parseEnvelope<OutletDetail>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat detail cabang.');
  }

  return json.data;
}

export async function createOutlet(body: {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  operatingHours?: string;
}): Promise<OutletRecord> {
  const res = await authFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<OutletRecord>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menambahkan cabang.');
  }

  return json.data;
}

export async function updateOutlet(
  outletId: string,
  body: {
    name?: string;
    code?: string;
    address?: string | null;
    phone?: string | null;
    operatingHours?: string | null;
    isActive?: boolean;
    isDefault?: boolean;
  },
): Promise<OutletRecord> {
  const res = await authFetch(`${BASE}/${outletId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<OutletRecord>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui cabang.');
  }

  return json.data;
}

export async function setDefaultOutlet(outletId: string): Promise<OutletRecord> {
  const res = await authFetch(`${BASE}/${outletId}/set-default`, { method: 'POST' });
  const json = await parseEnvelope<OutletRecord>(res);

  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menetapkan cabang utama.');
  }

  return json.data;
}
