import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { API_ROUTE_PREFIX, DEFAULT_API_PORT } from '@barokah/shared';
import { AUTH_ACCESS_COOKIE, AUTH_REFRESH_COOKIE } from '@/lib/auth-cookies';

const API_HOST = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${DEFAULT_API_PORT}`;

async function forwardWithAuth(request: NextRequest, pathSegments: string[]) {
  const jar = await cookies();
  const accessToken = jar.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = jar.get(AUTH_REFRESH_COOKIE)?.value;

  const targetPath = pathSegments.join('/');
  const url = `${API_HOST}/${API_ROUTE_PREFIX}/${targetPath}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let body: BodyInit | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  let upstream = await fetch(url, {
    method: request.method,
    headers,
    body,
  });

  if (upstream.status === 401 && refreshToken) {
    const refreshRes = await fetch(new URL('/api/auth/refresh', request.url), { method: 'POST' });
    if (refreshRes.ok) {
      const nextJar = await cookies();
      const nextAccess = nextJar.get(AUTH_ACCESS_COOKIE)?.value;
      if (nextAccess) {
        headers.set('Authorization', `Bearer ${nextAccess}`);
        upstream = await fetch(url, { method: request.method, headers, body });
      }
    }
  }

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardWithAuth(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardWithAuth(request, path);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardWithAuth(request, path);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardWithAuth(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forwardWithAuth(request, path);
}
