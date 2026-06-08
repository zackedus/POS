import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RealtimeService } from './realtime.service';

function createConfig(enabled = true) {
  return {
    get: (key: string) => {
      if (key === 'SOCKET_ENABLED') return enabled ? 'true' : 'false';
      return undefined;
    },
  };
}

test('RealtimeService: outletRoom uses tenant and outlet ids', () => {
  const service = new RealtimeService(createConfig() as never);
  assert.equal(service.outletRoom('t1', 'o1'), 'tenant:t1:outlet:o1');
});

test('RealtimeService: emit skipped when disabled', () => {
  const service = new RealtimeService(createConfig(false) as never);
  let emitted = false;
  service.registerEmitter({
    to: () => ({
      emit: () => {
        emitted = true;
      },
    }),
  });
  service.emitOnlineOrderPaid({
    orderId: '1',
    orderNo: 'WEB-001',
    outletId: 'o1',
    tenantId: 't1',
  });
  assert.equal(emitted, false);
});

test('RealtimeService: emitOnlineOrderPaid sends to outlet room', () => {
  const service = new RealtimeService(createConfig() as never);
  const events: Array<{ room: string; event: string; payload: unknown }> = [];
  service.registerEmitter({
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        events.push({ room, event, payload });
      },
    }),
  });
  service.emitOnlineOrderPaid({
    orderId: 'ord-1',
    orderNo: 'WEB-100',
    outletId: 'outlet-a',
    tenantId: 'tenant-x',
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]?.room, 'tenant:tenant-x:outlet:outlet-a');
  assert.equal(events[0]?.event, 'online-order:paid');
});

test('RealtimeService: emitDeliveryUpdated sends to outlet room', () => {
  const service = new RealtimeService(createConfig() as never);
  const events: Array<{ room: string; event: string; payload: unknown }> = [];
  service.registerEmitter({
    to: (room: string) => ({
      emit: (event: string, payload: unknown) => {
        events.push({ room, event, payload });
      },
    }),
  });
  service.emitDeliveryUpdated({
    deliveryId: 'dlv-1',
    deliveryNo: 'DLV-20260609-0001',
    outletId: 'outlet-a',
    tenantId: 'tenant-x',
    status: 'DISIAPKAN',
  });
  assert.equal(events.length, 1);
  assert.equal(events[0]?.room, 'tenant:tenant-x:outlet:outlet-a');
  assert.equal(events[0]?.event, 'delivery:updated');
});
