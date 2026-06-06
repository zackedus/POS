import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

function requestFor(path: string, cookies: Record<string, string> = {}) {
  const url = `http://localhost:3000${path}`;
  const req = new NextRequest(url);
  for (const [key, value] of Object.entries(cookies)) {
    req.cookies.set(key, value);
  }
  return req;
}

describe('middleware', () => {
  it('redirects unauthenticated users on /pos to login', () => {
    const res = middleware(requestFor('/pos'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('next=%2Fpos');
  });

  it('allows authenticated cashier on /pos', () => {
    const res = middleware(
      requestFor('/pos', {
        barokah_auth_session: '1',
        barokah_auth_role: 'CASHIER',
      }),
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects cashier away from /dashboard', () => {
    const res = middleware(
      requestFor('/dashboard/transactions', {
        barokah_auth_session: '1',
        barokah_auth_role: 'CASHIER',
      }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/pos');
  });

  it('allows manager on /master/bundles', () => {
    const res = middleware(
      requestFor('/master/bundles', {
        barokah_auth_session: '1',
        barokah_auth_role: 'MANAGER',
      }),
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects unauthenticated cashier from /shift to login', () => {
    const res = middleware(requestFor('/shift'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
    expect(res.headers.get('location')).toContain('next=%2Fshift');
  });

  it('redirects cashier away from /master/products', () => {
    const res = middleware(
      requestFor('/master/products', {
        barokah_auth_session: '1',
        barokah_auth_role: 'CASHIER',
      }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/pos');
  });

  it('allows manager on /pos', () => {
    const res = middleware(
      requestFor('/pos', {
        barokah_auth_session: '1',
        barokah_auth_role: 'MANAGER',
      }),
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });

  it('allows authenticated user when httpOnly access cookie present', () => {
    const res = middleware(
      requestFor('/pos', {
        barokah_access_token: 'jwt-token',
      }),
    );
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});
