import { expect, test } from '@playwright/test';

const OWNER = { email: 'owner@barokah.local', password: 'Owner123!' };
const CASHIER = { email: 'kasir@barokah.local', password: 'Kasir123!' };
const STOREFRONT_SLUG = 'barokah-bangunan';

async function login(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByPlaceholder('contoh: kasir@barokah.local').fill(creds.email);
  await page.getByPlaceholder('Masukkan password').fill(creds.password);
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeEnabled();
  await page.getByRole('button', { name: 'Masuk' }).click();
}

test.describe('Smoke — critical paths', () => {
  test('owner login → dashboard', async ({ page }) => {
    await login(page, OWNER);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Ringkasan Operasional' })).toBeVisible();
  });

  test('kasir login → POS', async ({ page }) => {
    await login(page, CASHIER);
    await expect(page).toHaveURL(/\/pos/);
    await expect(page.getByPlaceholder('Cari nama / SKU…')).toBeVisible({ timeout: 30_000 });
  });

  test('storefront catalog load', async ({ page }) => {
    await page.goto(`/store/${STOREFRONT_SLUG}`);
    await expect(page.getByRole('heading', { name: 'Katalog Produk' })).toBeVisible();
    await expect(page.getByPlaceholder('Cari semen, pipa, SKU...')).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Filter kategori' })).toBeVisible({ timeout: 30_000 });
  });
});
