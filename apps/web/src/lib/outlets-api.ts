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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export async function createOutlet(body: {
  name: string;
  code: string;
  address?: string;
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
    isActive?: boolean;
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
