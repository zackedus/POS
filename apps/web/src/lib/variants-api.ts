import { apiConfig } from './api';
import { authFetch } from './auth';

const BASE = `${apiConfig.baseUrl}/${apiConfig.prefix}`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  variantLabel: string | null;
  price: number;
  costPrice: number;
  isActive: boolean;
  parentProductId: string | null;
  unit?: { id: string; name: string; symbol: string } | null;
}

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  return (await res.json()) as ApiEnvelope<T>;
}

export async function fetchProductVariants(parentProductId: string): Promise<ProductVariant[]> {
  const res = await authFetch(`${BASE}/products/${parentProductId}/variants`);
  const json = await parseEnvelope<ProductVariant[]>(res);
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat varian produk.');
  }
  return json.data;
}

export async function createProductVariant(
  parentProductId: string,
  body: {
    sku: string;
    name: string;
    variantLabel: string;
    price: number;
    barcode?: string;
    costPrice?: number;
    isActive?: boolean;
  },
): Promise<ProductVariant> {
  const res = await authFetch(`${BASE}/products/${parentProductId}/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<ProductVariant>(res);
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal menambahkan varian.');
  }
  return json.data;
}

export async function updateProductVariant(
  parentProductId: string,
  variantId: string,
  body: Partial<{
    sku: string;
    name: string;
    variantLabel: string;
    price: number;
    barcode: string | null;
    costPrice: number;
    isActive: boolean;
  }>,
): Promise<ProductVariant> {
  const res = await authFetch(`${BASE}/products/${parentProductId}/variants/${variantId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<ProductVariant>(res);
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memperbarui varian.');
  }
  return json.data;
}

export async function deleteProductVariant(parentProductId: string, variantId: string): Promise<void> {
  const res = await authFetch(`${BASE}/products/${parentProductId}/variants/${variantId}`, {
    method: 'DELETE',
  });
  const json = await parseEnvelope(res);
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? 'Gagal menghapus varian.');
  }
}
