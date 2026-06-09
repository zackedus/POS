/** Standard page size options for list tables across web and API. */
export const PAGINATION_PAGE_SIZES = [10, 25, 50, 100] as const;

export type PaginationPageSize = (typeof PAGINATION_PAGE_SIZES)[number];

export const DEFAULT_PAGE_SIZE: PaginationPageSize = 25;

export const DEFAULT_PAGE = 1;
