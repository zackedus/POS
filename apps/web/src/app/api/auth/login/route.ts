import { NextResponse } from 'next/server';
import { API_ROUTE_PREFIX, DEFAULT_API_PORT } from '@barokah/shared';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  parseDurationToSeconds,
} from '@/lib/auth-cookies';
import { AUTH_ROLE_COOKIE, AUTH_SESSION_COOKIE } from '@/lib/auth';

const API_HOST = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${DEFAULT_API_PORT}`;
const AUTH_BASE = `${API_HOST}/${API_ROUTE_PREFIX}/auth`;

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message?: string };
}

function applyAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresIn: string },
  role?: string,
) {
  const accessMaxAge = parseDurationToSeconds(tokens.expiresIn);
  const refreshMaxAge = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d');

  response.cookies.set(AUTH_ACCESS_COOKIE, tokens.accessToken, authCookieOptions(accessMaxAge));
  response.cookies.set(AUTH_REFRESH_COOKIE, tokens.refreshToken, authCookieOptions(refreshMaxAge));
  response.cookies.set(AUTH_SESSION_COOKIE, '1', {
    ...authCookieOptions(refreshMaxAge),
    httpOnly: false,
  });
  if (role) {
    response.cookies.set(AUTH_ROLE_COOKIE, encodeURIComponent(role), {
      ...authCookieOptions(refreshMaxAge),
      httpOnly: false,
    });
  }
}

function clearAuthCookies(response: NextResponse) {
  for (const name of [AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, AUTH_SESSION_COOKIE, AUTH_ROLE_COOKIE]) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const res = await fetch(`${AUTH_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });
  const json = (await res.json()) as ApiEnvelope<{
    user: { role: string };
    tokens: { accessToken: string; refreshToken: string; expiresIn: string };
  }>;

  if (!res.ok || !json.success || !json.data) {
    return NextResponse.json(
      { success: false, error: json.error ?? { message: 'Login gagal.' } },
      { status: res.status },
    );
  }

  const response = NextResponse.json({ success: true, data: json.data });
  applyAuthCookies(response, json.data.tokens, json.data.user.role);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  clearAuthCookies(response);
  return response;
}
