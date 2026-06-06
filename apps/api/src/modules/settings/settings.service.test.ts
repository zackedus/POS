import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskServerKey, SettingsService } from './settings.service';

function createMidtransStub(overrides: Record<string, unknown> = {}) {
  return {
    pingConnection: async () => ({ ok: true, statusCode: 200, message: 'OK' }),
    getWebhookHealth: () => ({
      endpoint: '/api/v1/webhooks/midtrans/online',
      mockMode: true,
      signatureVerification: false,
    }),
    ...overrides,
  };
}

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
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
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
  const service = new SettingsService(prisma as never, createConfig('SB-Mid-server-test') as never, createMidtransStub() as never);
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

test('SettingsService: production mode when env key and MIDTRANS_IS_PRODUCTION true', async () => {
  const prisma = {
    tenantSettings: {
      findUnique: async () => null,
    },
  };
  const config = {
    get: (key: string) => {
      if (key === 'MIDTRANS_SERVER_KEY') return 'Mid-server-live-key';
      if (key === 'MIDTRANS_IS_PRODUCTION') return 'true';
      return undefined;
    },
  };
  const service = new SettingsService(prisma as never, config as never, createMidtransStub() as never);
  const view = await service.getTenantSettings({
    sub: 'u1',
    email: 'a@b.c',
    tenantId: 't1',
    role: 'OWNER',
    outletIds: ['o1'],
  });
  assert.equal(view.midtrans.mode, 'live');
  assert.equal(view.midtrans.keySource, 'env');
});

test('SettingsService: testMidtransConnection returns mock message when no key', async () => {
  const prisma = {
    tenantSettings: { findUnique: async () => null },
  };
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
  const result = await service.testMidtransConnection({
    sub: 'u1',
    email: 'a@b.c',
    tenantId: 't1',
    role: 'OWNER',
    outletIds: ['o1'],
  });
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'mock');
});
