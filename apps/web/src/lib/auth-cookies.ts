/** Cookie names shared between middleware, API routes, and client sync. */
export const AUTH_ACCESS_COOKIE = 'barokah_access_token';
export const AUTH_REFRESH_COOKIE = 'barokah_refresh_token';

export function useHttpOnlyAuthPath(): boolean {
  if (typeof window !== 'undefined') {
    return (
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_USE_HTTPONLY_AUTH === 'true'
    );
  }
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.USE_HTTPONLY_AUTH === 'true' ||
    process.env.NEXT_PUBLIC_USE_HTTPONLY_AUTH === 'true'
  );
}

export function authCookieOptions(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function parseDurationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    return 15 * 60;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 3600;
  return amount * 86400;
}
