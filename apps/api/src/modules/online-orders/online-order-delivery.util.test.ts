import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatOnlineDeliveryAddressFull,
  mapOnlineAddressToDeliveryFields,
  targetDeliveryStatusForOnlineOrder,
} from './online-order-delivery.util';

test('online delivery address maps to delivery fields', () => {
  const mapped = mapOnlineAddressToDeliveryFields({
    street: 'Jl. Merdeka No. 10',
    district: 'Coblong',
    city: 'Bandung',
    postalCode: '40123',
  });
  assert.ok(mapped);
  assert.equal(mapped?.addressLine1, 'Jl. Merdeka No. 10');
  assert.equal(mapped?.addressLine2, 'Coblong');
  assert.equal(mapped?.city, 'Bandung');
  assert.equal(mapped?.postalCode, '40123');
});

test('formatOnlineDeliveryAddressFull joins parts', () => {
  const full = formatOnlineDeliveryAddressFull({
    street: 'Jl. Sudirman 5',
    district: 'Setiabudi',
    city: 'Jakarta Selatan',
  });
  assert.equal(full, 'Jl. Sudirman 5, Setiabudi, Jakarta Selatan');
});

test('targetDeliveryStatusForOnlineOrder maps fulfillment steps', () => {
  assert.equal(targetDeliveryStatusForOnlineOrder('CONFIRMED'), 'MENUNGGU');
  assert.equal(targetDeliveryStatusForOnlineOrder('READY'), 'DISIAPKAN');
  assert.equal(targetDeliveryStatusForOnlineOrder('COMPLETED'), 'SELESAI');
  assert.equal(targetDeliveryStatusForOnlineOrder('READY', 'ship'), 'DIKIRIM');
});
