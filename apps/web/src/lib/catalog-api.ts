import { apiConfig } from '@/lib/api';
import { authFetch } from '@/lib/auth';
import type { ProductGridItem } from '@/components/pos/pos-types';

export const POS_SERVER_FILTER_THRESHOLD = 100;
export const MASTER_PRODUCTS_PAGE_SIZE = 50;
export const CATALOG_GRID_STALE_MS = 60_000;
export const CATALOG_CATEGORIES_STALE_MS = 300_000;
export const MASTER_PRODUCTS_STALE_MS = 120_000;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

export interface CategorySummary {
  id: string;
  name: string;
  productCount: number;
}

export interface ProductGridResult {
  items: ProductGridItem[];
  total: number;
}

export interface MasterProductListResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function normalizeGridResponse(data: ProductGridItem[] | ProductGridResult): ProductGridResult {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
  };
}

export async function fetchCategorySummary(): Promise<CategorySummary[]> {
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/categories/summary`);
  const json = (await res.json()) as ApiEnvelope<CategorySummary[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat kategori.');
  }
  return json.data;
}

export async function fetchProductGrid(params: {
  outletId?: string;
  categoryId?: string | null;
  q?: string;
  withMeta?: boolean;
}): Promise<ProductGridResult> {
  const query = buildQuery({
    outletId: params.outletId,
    categoryId: params.categoryId ?? undefined,
    q: params.q?.trim() || undefined,
    withMeta: params.withMeta ?? true,
  });
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products/grid${query}`);
  const json = (await res.json()) as ApiEnvelope<ProductGridItem[] | ProductGridResult>;
  if (!res.ok || !json.success || json.data == null) {
    throw new Error(json.error?.message ?? 'Gagal memuat katalog produk.');
  }
  return normalizeGridResponse(json.data);
}

export async function fetchMasterProducts<T>(params: {
  page: number;
  limit?: number;
  q?: string;
  categoryId?: string;
  includeCost?: boolean;
  includeInactive?: boolean;
}): Promise<MasterProductListResult<T>> {
  const query = buildQuery({
    page: params.page,
    limit: params.limit ?? MASTER_PRODUCTS_PAGE_SIZE,
    q: params.q?.trim() || undefined,
    categoryId: params.categoryId || undefined,
    includeCost: params.includeCost ? true : undefined,
    includeInactive: params.includeInactive ? true : undefined,
  });
  const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/products${query}`);
  const json = (await res.json()) as ApiEnvelope<MasterProductListResult<T>>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message ?? 'Gagal memuat produk.');
  }
  return json.data;
}
