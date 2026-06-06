import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_ACCESS_COOKIE } from '@/lib/auth-cookies';
import { AUTH_ROLE_COOKIE, AUTH_SESSION_COOKIE } from '@/lib/auth';

const PROTECTED_PREFIXES = ['/dashboard', '/master', '/pos', '/shift'] as const;

const ADMIN_PREFIXES = ['/dashboard', '/master'] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function decodeRole(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.get(AUTH_SESSION_COOKIE)?.value === '1' ||
    Boolean(request.cookies.get(AUTH_ACCESS_COOKIE)?.value);

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = decodeRole(request.cookies.get(AUTH_ROLE_COOKIE)?.value);
  if (role === 'CASHIER' && isAdminPath(pathname)) {
    const posUrl = request.nextUrl.clone();
    posUrl.pathname = '/pos';
    posUrl.search = '';
    return NextResponse.redirect(posUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/master/:path*', '/pos/:path*', '/shift/:path*'],
};
