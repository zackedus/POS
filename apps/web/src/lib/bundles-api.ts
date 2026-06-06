import { apiConfig } from '@/lib/api';
import { authApiJson } from '@/lib/api-client';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}/products/bundles`;

export interface BundleComponentInput {
  componentProductId: string;
  quantity: number;
}

export interface BundleRecord {
  id: string;
  bundleProductId: string;
  isActive: boolean;
  notes: string | null;
  bundleProduct: {
    id: string;
    sku: string;
    name: string;
    price: number;
    costPrice?: number;
    rolledUpCost?: number;
    margin?: number;
  };
  items: Array<{
    id: string;
    componentProductId: string;
    quantity: number;
    componentProduct: {
      id: string;
      sku: string;
      name: string;
      price: number;
      costPrice?: number;
    };
  }>;
  outletPolicies?: Array<{
    id: string;
    outletId: string;
    isActive: boolean;
    outlet: { id: string; code: string; name: string };
  }>;
}

export async function fetchBundles(): Promise<BundleRecord[]> {
  return authApiJson<BundleRecord[]>(`${BASE}`, undefined, 'Gagal memuat bundling.');
}

export async function createBundle(input: {
  bundleProductId: string;
  items: BundleComponentInput[];
  isActive?: boolean;
  notes?: string;
}): Promise<unknown> {
  return authApiJson(
    BASE,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Gagal membuat bundle.',
  );
}

export async function updateBundle(
  bundleProductId: string,
  input: { items?: BundleComponentInput[]; isActive?: boolean; notes?: string },
): Promise<BundleRecord | null> {
  return authApiJson<BundleRecord | null>(
    `${BASE}/${bundleProductId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Gagal memperbarui bundle.',
  );
}

export async function deleteBundle(bundleProductId: string): Promise<void> {
  await authApiJson(
    `${BASE}/${bundleProductId}`,
    { method: 'DELETE' },
    'Gagal menghapus bundle.',
  );
}

export async function upsertBundleOutletPolicy(input: {
  bundleProductId: string;
  outletId: string;
  isActive: boolean;
  notes?: string;
}): Promise<void> {
  await authApiJson(
    `${BASE}/outlet-policy`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
    'Gagal menyimpan kebijakan outlet bundle.',
  );
}
