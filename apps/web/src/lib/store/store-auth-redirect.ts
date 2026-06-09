const DEFAULT_ACCOUNT_PATH = (slug: string) => `/store/${slug}/account`;

function normalizeRedirectPath(slug: string, raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return null;

  const storePrefix = `/store/${slug}`;
  if (trimmed === storePrefix || trimmed.startsWith(`${storePrefix}/`)) {
    return trimmed;
  }

  return null;
}

/** Resolves post-login/register destination from `redirect` or `returnUrl` query params. */
export function getPostAuthRedirectUrl(
  slug: string,
  searchParams: Pick<URLSearchParams, 'get'>,
  defaultPath = DEFAULT_ACCOUNT_PATH(slug),
): string {
  const raw = searchParams.get('redirect') ?? searchParams.get('returnUrl');
  if (!raw) return defaultPath;
  return normalizeRedirectPath(slug, raw) ?? defaultPath;
}

export function shortCustomerName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 12 ? `${first.slice(0, 11)}…` : first;
}
