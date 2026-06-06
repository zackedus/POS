import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MidtransService } from './midtrans.service';

function createConfig(overrides: Record<string, string | undefined> = {}) {
  return {
    get: (key: string) => {
      if (key in overrides) return overrides[key];
      if (key === 'MIDTRANS_SERVER_KEY') return undefined;
      if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
      return undefined;
    },
  };
}

test('MidtransService: getWebhookHealth exposes endpoint metadata', () => {
  const service = new MidtransService(createConfig() as never);
  const health = service.getWebhookHealth();
  assert.equal(health.endpoint, '/api/v1/webhooks/midtrans/online');
  assert.equal(health.mockMode, true);
});

test('MidtransService: pingConnection rejects empty key', async () => {
  const service = new MidtransService(createConfig() as never);
  const result = await service.pingConnection({ serverKey: '', isProduction: false });
  assert.equal(result.ok, false);
  assert.match(result.message, /mock|belum/i);
});
