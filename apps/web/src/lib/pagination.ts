import type { PaginationMeta } from '@barokah/shared';

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

export function buildPaginationQuery(params: {
  page?: number;
  limit?: number;
  extra?: Record<string, string | number | boolean | undefined>;
}): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.extra) {
    for (const [key, value] of Object.entries(params.extra)) {
      if (value !== undefined && value !== '') {
        search.set(key, String(value));
      }
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
