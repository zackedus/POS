import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defaultStorefrontSettings,
  isMidtransSandboxKey,
  validateStorefrontPaymentSettings,
} from './storefront-settings';

test('detects sandbox key prefix', () => {
  assert.equal(isMidtransSandboxKey('SB-Mid-server-abc'), true);
  assert.equal(isMidtransSandboxKey('Mid-server-live'), false);
});

test('requires fulfillment when payment methods enabled', () => {
  const settings = defaultStorefrontSettings();
  settings.branches.pickupEnabled = false;
  settings.branches.deliveryEnabled = false;
  settings.payment.onlinePaymentEnabled = true;

  const result = validateStorefrontPaymentSettings(settings, true);
  assert.ok(
    result.errors.includes(
      'Aktifkan minimal satu metode pengambilan (pickup atau delivery) sebelum mengaktifkan pembayaran.',
    ),
  );
});

test('warns when online enabled without midtrans keys', () => {
  const settings = defaultStorefrontSettings();
  const result = validateStorefrontPaymentSettings(settings, false);
  assert.ok(result.warnings.some((w) => w.includes('fallback mode mock')));
});

test('blocks COD when delivery disabled', () => {
  const settings = defaultStorefrontSettings();
  settings.branches.deliveryEnabled = false;
  settings.payment.codEnabled = true;

  const result = validateStorefrontPaymentSettings(settings, true);
  assert.ok(result.errors.includes('COD hanya tersedia jika pengiriman ke alamat aktif.'));
});
