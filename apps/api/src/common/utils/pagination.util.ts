import type { PaginationMeta } from '@barokah/shared';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

export function resolvePagination(
  query: { page?: number; limit?: number },
  defaultLimit = DEFAULT_LIMIT,
): { page: number; limit: number; skip: number } {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = Math.min(query.limit ?? defaultLimit, MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
