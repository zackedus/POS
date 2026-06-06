import { expect, test } from '@playwright/test';

const CASHIER = { email: 'kasir@barokah.local', password: 'Kasir123!' };
const STOREFRONT_SLUG = 'barokah-bangunan';
const API_BASE = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3000/api/v1';
const WEB_BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';

test.describe('Fase 2 — online order mock pay → kasir fulfill', () => {
  test.skip(!process.env.PLAYWRIGHT_API_URL && !process.env.CI, 'Requires API at PLAYWRIGHT_API_URL');

  test('paid online order appears in cashier fulfillment queue', async ({ page }) => {
    const outletsRes = await fetch(`${API_BASE}/store/${STOREFRONT_SLUG}/outlets`);
    expect(outletsRes.ok).toBeTruthy();
    const outletsBody = (await outletsRes.json()) as {
      success: boolean;
      data: { outlets: Array<{ id: string }> };
    };
    const outletId = outletsBody.data.outlets[0]?.id;
    expect(outletId).toBeTruthy();

    const catalogRes = await fetch(`${API_BASE}/store/${STOREFRONT_SLUG}/products?limit=1`);
    expect(catalogRes.ok).toBeTruthy();
    const catalogBody = (await catalogRes.json()) as {
      success: boolean;
      data: { items: Array<{ id: string }> };
    };
    const productId = catalogBody.data.items[0]?.id;
    expect(productId).toBeTruthy();

    const clientRequestId = `e2e-f2-${Date.now()}`;
    const createRes = await fetch(`${API_BASE}/store/${STOREFRONT_SLUG}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientRequestId,
        outletId,
        fulfillmentType: 'PICKUP',
        customer: { name: 'E2E Fase2', phone: '081234567890' },
        items: [{ productId, quantity: 1 }],
      }),
    });
    expect(createRes.ok).toBeTruthy();
    const createBody = (await createRes.json()) as {
      success: boolean;
      data: { order: { orderNo: string } };
    };
    const orderNo = createBody.data.order.orderNo;

    const mockPayRes = await fetch(
      `${API_BASE}/store/${STOREFRONT_SLUG}/orders/${orderNo}/mock-pay`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '081234567890' }),
      },
    );
    expect(mockPayRes.ok).toBeTruthy();

    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CASHIER),
    });
    expect(loginRes.ok).toBeTruthy();
    const loginBody = (await loginRes.json()) as {
      data: { tokens: { accessToken: string } };
    };
    await page.context().addCookies([
      {
        name: 'barokah_access_token',
        value: loginBody.data.tokens.accessToken,
        url: WEB_BASE,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 86_400,
      },
    ]);

    await page.goto('/pos/online-orders', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(orderNo)).toBeVisible({ timeout: 30_000 });
  });
});
