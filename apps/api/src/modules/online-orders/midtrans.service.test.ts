import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { MidtransService } from './midtrans.service';

function buildConfig(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  } as ConfigService;
}

test('MidtransService: isMockMode when server key empty', () => {
  const service = new MidtransService(buildConfig({ MIDTRANS_SERVER_KEY: '' }));
  assert.equal(service.isMockMode(), true);
});

test('MidtransService: isMockMode false when server key set', () => {
  const service = new MidtransService(buildConfig({ MIDTRANS_SERVER_KEY: 'SB-Mid-server-test' }));
  assert.equal(service.isMockMode(), false);
});

test('MidtransService: verifySignature rejects production mode without key', () => {
  const service = new MidtransService(
    buildConfig({
      MIDTRANS_SERVER_KEY: '',
      MIDTRANS_IS_PRODUCTION: 'true',
      MIDTRANS_WEBHOOK_SKIP_VERIFY: 'true',
    }),
  );

  assert.equal(
    service.verifySignature({
      order_id: 'WEB-1',
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '100000.00',
    }),
    false,
  );
});

test('MidtransService: createSnapPayment mock redirect when no server key', async () => {
  const service = new MidtransService(
    buildConfig({
      MIDTRANS_SERVER_KEY: '',
      STOREFRONT_BASE_URL: 'http://localhost:3001',
    }),
  );

  const result = await service.createSnapPayment({
    orderId: 'WEB-20260606-0001',
    orderNo: 'WEB-20260606-0001',
    tenantSlug: 'barokah-bangunan',
    grossAmount: 150000,
    customerName: 'Budi',
    customerPhone: '081234567890',
  });

  assert.match(result.snapToken, /^mock-snap-/);
  assert.equal(
    result.redirectUrl,
    'http://localhost:3001/store/barokah-bangunan/order/WEB-20260606-0001/pay?mock=1',
  );
});

test('MidtransService: verifySignature skips when webhook skip verify enabled', () => {
  const service = new MidtransService(
    buildConfig({
      MIDTRANS_SERVER_KEY: '',
      MIDTRANS_WEBHOOK_SKIP_VERIFY: 'true',
    }),
  );

  assert.equal(
    service.verifySignature({
      order_id: 'WEB-1',
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '100000.00',
    }),
    true,
  );
});

test('MidtransService: isPaidNotification recognizes settlement', () => {
  const service = new MidtransService(buildConfig({}));
  assert.equal(
    service.isPaidNotification({
      order_id: 'WEB-1',
      transaction_status: 'settlement',
      status_code: '200',
      gross_amount: '100000.00',
    }),
    true,
  );
});
