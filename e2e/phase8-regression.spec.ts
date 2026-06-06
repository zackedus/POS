import { expect, test } from '@playwright/test';

const MANAGER = { email: 'manager@barokah.local', password: 'Manager123!' };
const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3000/api/v1';

async function loginApi(creds: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(creds),
  });
  expect(res.ok).toBeTruthy();
  const body = (await res.json()) as {
    success: boolean;
    data: { tokens: { accessToken: string } };
  };
  return body.data.tokens.accessToken;
}

test.describe('Phase 8 — regression extensions', () => {
  test('manager can open purchase orders list', async ({ page }) => {
    const token = await loginApi(MANAGER);
    await page.context().addCookies([
      {
        name: 'barokah_access_token',
        value: token,
        url: WEB_BASE,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 86_400,
      },
    ]);
    await page.goto('/dashboard/purchase-orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Order Distributor|Purchase Order/i })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('settings page shows Midtrans test connection control', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/email/i).fill('owner@barokah.local');
    await page.getByLabel(/password/i).fill('Owner123!');
    await page.getByRole('button', { name: /masuk|login/i }).click();
    await page.goto('/dashboard/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Uji Koneksi Midtrans/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
