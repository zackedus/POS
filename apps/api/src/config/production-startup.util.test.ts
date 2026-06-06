import assert from 'node:assert/strict';
import test from 'node:test';
import { collectProductionStartupWarnings } from './production-startup.util';

test('production startup: warns when Midtrans live without key', () => {
  const config = {
    get: (key: string) => {
      if (key === 'NODE_ENV') return 'production';
      if (key === 'MIDTRANS_IS_PRODUCTION') return 'true';
      if (key === 'MIDTRANS_SERVER_KEY') return '';
      if (key === 'JWT_SECRET') return 'strong-secret';
      if (key === 'SMTP_HOST') return 'smtp.example.com';
      return undefined;
    },
  };
  const warnings = collectProductionStartupWarnings(config as never);
  assert.ok(warnings.some((w) => w.code === 'MIDTRANS_LIVE_NO_KEY'));
});

test('production startup: no warnings in development', () => {
  const config = { get: (key: string) => (key === 'NODE_ENV' ? 'development' : undefined) };
  assert.equal(collectProductionStartupWarnings(config as never).length, 0);
});
