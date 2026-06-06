import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookiesGetMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: cookiesGetMock,
  }),
}));

describe('POST /api/auth/refresh', () => {
  beforeEach(() => {
    cookiesGetMock.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns 401 when refresh cookie is missing', async () => {
    cookiesGetMock.mockReturnValue(undefined);
    const { POST } = await import('./route');
    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error?.message).toContain('Sesi telah berakhir');
  });

  it('returns 401 and clears cookies when upstream refresh fails', async () => {
    cookiesGetMock.mockReturnValue({ value: 'stale-refresh-token' });
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'Sesi telah berakhir.' } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { POST } = await import('./route');
    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    const cleared = res.cookies.getAll().filter((cookie) => cookie.value === '');
    expect(cleared.length).toBeGreaterThan(0);
  });
});
