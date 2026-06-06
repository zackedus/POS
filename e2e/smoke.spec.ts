import { expect, test } from '@playwright/test';

const OWNER = { email: 'owner@barokah.local', password: 'Owner123!' };
const CASHIER = { email: 'kasir@barokah.local', password: 'Kasir123!' };
const STOREFRONT_SLUG = 'barokah-bangunan';
const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3000/api/v1';

const COOKIE_EXPIRES = Math.floor(Date.now() / 1000) + 86_400;

async function seedSession(
  page: import('@playwright/test').Page,
  creds: { email: string; password: string },
): Promise<{ role: string }> {
  await page.context().clearCookies();

  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as {
    success: boolean;
    data: {
      user: { role: string };
      tokens: { accessToken: string; refreshToken: string };
    };
  };
  expect(body.success).toBe(true);

  const { accessToken, refreshToken } = body.data.tokens;
  const { role } = body.data.user;

  const bffRes = await page.request.post(`${WEB_BASE}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
    timeout: 20_000,
  });
  if (!bffRes.ok()) {
    // Fallback when BFF unavailable (e.g. partial dev stack).
    await page.context().addCookies([
      {
        name: 'barokah_access_token',
        value: accessToken,
        url: WEB_BASE,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: COOKIE_EXPIRES,
      },
      {
        name: 'barokah_refresh_token',
        value: refreshToken,
        url: WEB_BASE,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: COOKIE_EXPIRES,
      },
      {
        name: 'barokah_auth_session',
        value: '1',
        url: WEB_BASE,
        path: '/',
        sameSite: 'Lax',
        expires: COOKIE_EXPIRES,
      },
      {
        name: 'barokah_auth_role',
        value: encodeURIComponent(role),
        url: WEB_BASE,
        path: '/',
        sameSite: 'Lax',
        expires: COOKIE_EXPIRES,
      },
    ]);
  }

  const proxyMe = await page.request.get(`${WEB_BASE}/api/proxy/auth/me`);
  expect(proxyMe.ok()).toBeTruthy();

  await page.goto(`${WEB_BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ accessToken, refreshToken, role }) => {
      localStorage.setItem('barokah_access_token', accessToken);
      localStorage.setItem('barokah_refresh_token', refreshToken);
      localStorage.setItem('barokah_user_role', role);
    },
    { accessToken, refreshToken, role },
  );

  const meRes = await page.request.get(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(meRes.ok()).toBeTruthy();

  const browserMeStatus = await page.evaluate(async () => {
    const res = await fetch('/api/proxy/auth/me', { credentials: 'include' });
    return res.status;
  });
  expect(browserMeStatus).toBe(200);

  return { role };
}

test.describe('Smoke — critical paths', () => {
  test('owner login → dashboard', async ({ page }) => {
    await seedSession(page, OWNER);

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText('Ringkasan Operasional')).toBeVisible({ timeout: 30_000 });
  });

  test('kasir login → POS', async ({ page }) => {
    await seedSession(page, CASHIER);

    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/pos/, { timeout: 15_000 });
    await expect(page.getByLabel('Cari produk berdasarkan nama atau SKU')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('storefront catalog load', async ({ page }) => {
    await page.goto(`/store/${STOREFRONT_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Katalog Produk' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByPlaceholder('Cari semen, pipa, SKU...')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Filter kategori' })).toBeVisible({ timeout: 30_000 });
  });
});
