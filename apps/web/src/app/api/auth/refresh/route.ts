import { cookies } from 'next/headers';
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

export async function POST() {
  const jar = await cookies();
  const refreshToken = jar.get(AUTH_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: { message: 'Sesi telah berakhir.' } },
      { status: 401 },
    );
  }

  const res = await fetch(`${AUTH_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = (await res.json()) as ApiEnvelope<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
  }>;

  if (!res.ok || !json.success || !json.data) {
    const response = NextResponse.json(
      { success: false, error: json.error ?? { message: 'Sesi telah berakhir.' } },
      { status: 401 },
    );
    for (const name of [AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, AUTH_SESSION_COOKIE, AUTH_ROLE_COOKIE]) {
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
    }
    return response;
  }

  const accessMaxAge = parseDurationToSeconds(json.data.expiresIn);
  const refreshMaxAge = parseDurationToSeconds(process.env.JWT_REFRESH_EXPIRES_IN ?? '7d');
  const response = NextResponse.json({ success: true, data: json.data });
  response.cookies.set(AUTH_ACCESS_COOKIE, json.data.accessToken, authCookieOptions(accessMaxAge));
  response.cookies.set(AUTH_REFRESH_COOKIE, json.data.refreshToken, authCookieOptions(refreshMaxAge));
  response.cookies.set(AUTH_SESSION_COOKIE, '1', {
    ...authCookieOptions(refreshMaxAge),
    httpOnly: false,
  });
  return response;
}
