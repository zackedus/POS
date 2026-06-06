import { describe, expect, it, vi } from 'vitest';
import { ErrorCodes } from '@barokah/shared';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    apiConfig: { baseUrl: 'http://localhost:3000', prefix: 'api/v1' },
  };
});

describe('publicApiJson rate limit handling', () => {
  it('throws user-friendly message on HTTP 429', async () => {
    const { publicApiJson } = await import('./api-client');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
            message: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
          },
        }),
      }),
    );

    await expect(publicApiJson('http://localhost:3000/api/v1/store/toko/orders')).rejects.toMatchObject({
      message: 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.',
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      status: 429,
    });
  });
});
