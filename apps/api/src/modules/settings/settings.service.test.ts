import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskServerKey, SettingsService } from './settings.service';

function createConfig(envKey?: string) {
  return {
    get: (key: string) => {
      if (key === 'MIDTRANS_SERVER_KEY') return envKey;
      if (key === 'MIDTRANS_IS_PRODUCTION') return 'false';
      return undefined;
    },
  };
}

test('maskServerKey masks middle of key', () => {
  assert.equal(maskServerKey('SB-Mid-server-abc123xyz'), 'SB-Mid****3xyz');
  assert.equal(maskServerKey(null), null);
});

test('SettingsService: mock mode when no keys', async () => {
  const prisma = {
    tenantSettings: {
      findUnique: async () => null,
    },
  };
  const service = new SettingsService(prisma as never, createConfig() as never);
  const view = await service.getTenantSettings({
    sub: 'u1',
    email: 'a@b.c',
    tenantId: 't1',
    role: 'OWNER',
    outletIds: ['o1'],
  });
  assert.equal(view.midtrans.mode, 'mock');
  assert.equal(view.ppnEnabled, false);
});

test('SettingsService: sandbox when env key present', async () => {
  const prisma = {
    tenantSettings: {
      findUnique: async () => ({
        ppnEnabled: true,
        ppnRatePercent: { toString: () => '11' },
        midtransServerKey: null,
        midtransIsProduction: false,
      }),
    },
  };
  const service = new SettingsService(prisma as never, createConfig('SB-Mid-server-test') as never);
  const view = await service.getTenantSettings({
    sub: 'u1',
    email: 'a@b.c',
    tenantId: 't1',
    role: 'OWNER',
    outletIds: ['o1'],
  });
  assert.equal(view.midtrans.mode, 'sandbox');
  assert.equal(view.midtrans.keySource, 'env');
  assert.equal(view.ppnEnabled, true);
});
