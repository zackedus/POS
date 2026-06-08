import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryNo, deliveryStatusLabel, formatAddressSnippet, resolveDeliveryListCreatedAtFilter } from './delivery.util';

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

test('Delivery util: resolveDeliveryListCreatedAtFilter uses WIB day bounds', () => {
  const filter = resolveDeliveryListCreatedAtFilter('2026-06-10', '2026-06-10');
  const jakartaEarlyMorning = new Date('2026-06-09T17:30:00.000Z');
  assert.ok(jakartaEarlyMorning >= filter.gte!);
  assert.ok(jakartaEarlyMorning < filter.lt!);

  const previousDayFilter = resolveDeliveryListCreatedAtFilter('2026-06-09', '2026-06-09');
  assert.ok(jakartaEarlyMorning >= previousDayFilter.lt!);
});
