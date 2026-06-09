import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOnlineOrderChannelWhere,
  buildTransactionSourceWhere,
  deriveOnlineOrderDisplayStatus,
  deriveSaleSourceFromOnlineChannel,
  deriveSaleSourceFromTransaction,
  deriveTransactionDisplayStatus,
  matchesDisplayStatusFilter,
  summarizePaymentMethods,
} from './sale-source.util';

test('sale-source: deriveSaleSourceFromOnlineChannel', () => {
  assert.equal(deriveSaleSourceFromOnlineChannel('WEB'), 'WEB');
  assert.equal(deriveSaleSourceFromOnlineChannel('TOKOPEDIA'), 'MARKETPLACE');
  assert.equal(deriveSaleSourceFromOnlineChannel('SHOPEE'), 'MARKETPLACE');
  assert.equal(deriveSaleSourceFromOnlineChannel(undefined), 'TOKO');
});

test('sale-source: deriveSaleSourceFromTransaction uses linked online order', () => {
  assert.equal(
    deriveSaleSourceFromTransaction({
      deliveryOrders: [{ onlineOrder: { channel: 'WEB' } }],
    }),
    'WEB',
  );
  assert.equal(
    deriveSaleSourceFromTransaction({
      deliveryOrders: [{ onlineOrder: { channel: 'TOKOPEDIA' } }],
    }),
    'MARKETPLACE',
  );
  assert.equal(deriveSaleSourceFromTransaction({ deliveryOrders: [] }), 'TOKO');
});

test('sale-source: deriveTransactionDisplayStatus partial refund', () => {
  const result = deriveTransactionDisplayStatus({
    status: 'COMPLETED',
    total: 100_000,
    adjustments: [{ type: 'REFUND', amount: 40_000 }],
  });
  assert.equal(result.displayStatus, 'PARTIAL');
});

test('sale-source: deriveOnlineOrderDisplayStatus maps cancelled', () => {
  const result = deriveOnlineOrderDisplayStatus('CANCELLED');
  assert.equal(result.displayStatus, 'CANCELLED');
});

test('sale-source: buildTransactionSourceWhere for TOKO excludes online delivery', () => {
  const where = buildTransactionSourceWhere('TOKO');
  assert.ok(where?.NOT);
});

test('sale-source: buildOnlineOrderChannelWhere null for TOKO', () => {
  assert.equal(buildOnlineOrderChannelWhere('TOKO'), null);
  assert.deepEqual(buildOnlineOrderChannelWhere('WEB'), { channel: 'WEB' });
});

test('sale-source: matchesDisplayStatusFilter', () => {
  assert.equal(matchesDisplayStatusFilter('PARTIAL', 'PARTIAL'), true);
  assert.equal(matchesDisplayStatusFilter('COMPLETED', 'VOID'), false);
});

test('sale-source: summarizePaymentMethods split', () => {
  const result = summarizePaymentMethods(['CASH', 'TRANSFER']);
  assert.equal(result.paymentMethod, 'SPLIT');
  assert.match(result.paymentMethodLabel ?? '', /Tunai/);
});
