/**
 * Normalized product search — ILIKE partial match with token splitting.
 * Strips common separators so "cat-5l" matches "Cat 5L".
 */
export function normalizeProductSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s\-_./]+/g, '');
}

export function tokenizeProductSearchQuery(query: string): string[] {
  const normalized = normalizeProductSearchText(query);
  if (!normalized) return [];
  const rawTokens = query
    .trim()
    .split(/[\s,]+/)
    .map((token) => normalizeProductSearchText(token))
    .filter(Boolean);
  return rawTokens.length > 0 ? rawTokens : [normalized];
}

type InsensitiveContains = { contains: string; mode: 'insensitive' };

function fieldOrClauses(token: string): Array<Record<string, InsensitiveContains>> {
  return [
    { name: { contains: token, mode: 'insensitive' } },
    { sku: { contains: token, mode: 'insensitive' } },
    { barcode: { contains: token, mode: 'insensitive' } },
    { variantLabel: { contains: token, mode: 'insensitive' } },
  ];
}

/**
 * Builds Prisma where fragment: each token must match at least one field (AND of ORs).
 */
export function buildProductSearchWhere(
  keyword: string | undefined,
): Record<string, unknown> | undefined {
  const trimmed = keyword?.trim();
  if (!trimmed) return undefined;

  const tokens = tokenizeProductSearchQuery(trimmed);

  if (tokens.length === 1) {
    return { OR: fieldOrClauses(tokens[0]) };
  }

  return {
    AND: tokens.map((token) => ({ OR: fieldOrClauses(token) })),
  };
}

/** Client-side filter for cached product grids (POS offline / small catalogs). */
export function matchesProductSearch(
  item: { name: string; sku: string; variantLabel?: string | null; barcode?: string | null },
  keyword: string,
): boolean {
  const tokens = tokenizeProductSearchQuery(keyword);
  if (tokens.length === 0) return true;

  const haystack = [
    item.name,
    item.sku,
    item.variantLabel ?? '',
    item.barcode ?? '',
  ]
    .map(normalizeProductSearchText)
    .join(' ');

  return tokens.every((token) => haystack.includes(token));
}
