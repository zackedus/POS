import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryNo, deliveryStatusLabel, formatAddressSnippet } from './delivery.util';

test('Delivery util: buildDeliveryNo pads sequence', () => {
  assert.equal(buildDeliveryNo('2026-06-09', 7), 'DLV-20260609-0007');
});

test('Delivery util: deliveryStatusLabel returns Indonesian label', () => {
  assert.equal(deliveryStatusLabel('MENUNGGU'), 'Menunggu');
  assert.equal(deliveryStatusLabel('DIKIRIM'), 'Dikirim');
});

test('Delivery util: formatAddressSnippet joins parts', () => {
  assert.equal(
    formatAddressSnippet({
      addressLine1: 'Jl. Proyek 12',
      addressLine2: 'Lantai 2',
      city: 'Bandung',
      province: 'Jawa Barat',
    }),
    'Jl. Proyek 12, Lantai 2, Bandung, Jawa Barat',
  );
});
