import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HealthService } from './health.service';

test('SCR-S12-06: health includes redis service status', async () => {
  const prisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
  };

  const redisService = {
    ping: async () => 'up' as const,
  };

  const service = new HealthService(prisma as never, redisService as never);
  const result = await service.check();

  assert.equal(result.status, 'ok');
  assert.equal(result.services.database, 'up');
  assert.equal(result.services.redis, 'up');
});

test('SCR-S12-07: health degraded when redis down but database up', async () => {
  const prisma = {
    $queryRaw: async () => [{ '?column?': 1 }],
  };

  const redisService = {
    ping: async () => 'down' as const,
  };

  const service = new HealthService(prisma as never, redisService as never);
  const result = await service.check();

  assert.equal(result.status, 'degraded');
  assert.equal(result.services.redis, 'down');
});
