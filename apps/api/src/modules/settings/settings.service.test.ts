import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
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

test('SettingsService: manager cannot update Midtrans or weekly email settings', async () => {
  const prisma = {
    tenantSettings: {
      upsert: async () => {
        throw new Error('should not upsert');
      },
    },
  };
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
  await assert.rejects(
    () =>
      service.updateTenantSettings(
        {
          sub: 'u1',
          email: 'm@b.c',
          tenantId: 't1',
          role: 'MANAGER',
          outletIds: ['o1'],
        },
        { midtransIsProduction: true },
      ),
    (err: unknown) => {
      assert.ok(err instanceof ForbiddenException);
      return true;
    },
  );
});

test('SettingsService: manager can update PPN and loyalty settings', async () => {
  let upsertPayload: Record<string, unknown> = {};
  const prisma = {
    tenantSettings: {
      upsert: async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        upsertPayload = args.update;
        return {
          ppnEnabled: true,
          ppnRatePercent: { toString: () => '11' },
          midtransServerKey: null,
          midtransIsProduction: false,
          weeklyReportEmailEnabled: false,
          loyaltyPointsEnabled: true,
          loyaltyEarnRateIdr: 8000,
          loyaltyRedeemEnabled: true,
          loyaltyRedeemValueIdr: 1000,
          loyaltyRedeemMaxPercent: 40,
        };
      },
    },
  };
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
  const view = await service.updateTenantSettings(
    {
      sub: 'u1',
      email: 'm@b.c',
      tenantId: 't1',
      role: 'MANAGER',
      outletIds: ['o1'],
    },
    { ppnEnabled: true, loyaltyEarnRateIdr: 8000, loyaltyRedeemMaxPercent: 40 },
  );
  assert.equal(view.ppnEnabled, true);
  assert.equal(view.loyaltyEarnRateIdr, 8000);
  assert.equal(upsertPayload?.ppnEnabled, true);
  assert.equal(upsertPayload?.loyaltyEarnRateIdr, 8000);
});

test('SettingsService: getTenantProfile returns tenant fields', async () => {
  const prisma = {
    tenant: {
      findFirst: async () => ({
        id: 't1',
        name: 'Barokah Toko Bangunan',
        slug: 'barokah-bangunan',
        contactPhone: '021-5551234',
        logoUrl: null,
        isActive: true,
        updatedAt: new Date('2026-06-08T00:00:00Z'),
      }),
    },
  };
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
  const profile = await service.getTenantProfile({
    sub: 'u1',
    email: 'owner@barokah.local',
    tenantId: 't1',
    role: 'OWNER',
    outletIds: ['o1'],
  });
  assert.equal(profile.slug, 'barokah-bangunan');
  assert.equal(profile.contactPhone, '021-5551234');
});

test('SettingsService: manager cannot change tenant name', async () => {
  const prisma = { tenant: { update: async () => ({}) } };
  const service = new SettingsService(prisma as never, createConfig() as never, createMidtransStub() as never);
  await assert.rejects(
    () =>
      service.updateTenantProfile(
        {
          sub: 'u1',
          email: 'm@b.c',
          tenantId: 't1',
          role: 'MANAGER',
          outletIds: ['o1'],
        },
        { name: 'Nama Baru' },
      ),
    ForbiddenException,
  );
});
