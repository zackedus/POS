import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarketplaceOrderNo,
  buildOrderNo,
  formatDeliveryAddressSnippet,
  normalizePhone,
  onlineOrderChannelLabel,
  orderStatusLabel,
  paymentExpiresAt,
} from './online-order.util';

test('OnlineOrder util: normalizePhone converts 08 to 62', () => {
  assert.equal(normalizePhone('081234567890'), '6281234567890');
  assert.equal(normalizePhone('6281234567890'), '6281234567890');
});

test('OnlineOrder util: buildOrderNo pads sequence', () => {
  assert.equal(buildOrderNo('2026-06-05', 42), 'WEB-20260605-0042');
});

test('OnlineOrder util: buildMarketplaceOrderNo uses channel prefix', () => {
  assert.equal(buildMarketplaceOrderNo('TOKOPEDIA', '2026-06-09', 3), 'MP-TKP-20260609-0003');
  assert.equal(buildMarketplaceOrderNo('SHOPEE', '2026-06-09', 1), 'MP-SHP-20260609-0001');
});

test('OnlineOrder util: onlineOrderChannelLabel maps WEB', () => {
  assert.equal(onlineOrderChannelLabel('WEB'), 'Order Web');
});

test('OnlineOrder util: orderStatusLabel maps PAID', () => {
  assert.equal(orderStatusLabel('PAID'), 'Sudah dibayar');
});

test('OnlineOrder util: paymentExpiresAt is 60 minutes ahead', () => {
  const from = new Date('2026-06-05T10:00:00.000Z');
  const expires = paymentExpiresAt(from);
  assert.equal(expires.getTime() - from.getTime(), 60 * 60 * 1000);
});

test('OnlineOrder util: formatDeliveryAddressSnippet joins address parts', () => {
  assert.equal(
    formatDeliveryAddressSnippet({
      street: 'Jl. Merdeka No. 10',
      district: 'Coblong',
      city: 'Bandung',
    }),
    'Jl. Merdeka No. 10, Coblong, Bandung',
  );
  assert.equal(formatDeliveryAddressSnippet(null), null);
});
