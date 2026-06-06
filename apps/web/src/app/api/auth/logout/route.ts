import { NextResponse } from 'next/server';
import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  AUTH_ROLE_COOKIE,
  AUTH_SESSION_COOKIE,
} from '@/lib/auth-cookies';

export async function POST() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  for (const name of [AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE, AUTH_SESSION_COOKIE, AUTH_ROLE_COOKIE]) {
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  }
  return response;
}
