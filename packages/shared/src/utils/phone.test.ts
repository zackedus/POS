import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneDisplay, isValidIndonesianMobilePhone, normalizePhone } from './phone';

test('normalizePhone converts 08 to 62', () => {
  assert.equal(normalizePhone('081234567890'), '6281234567890');
  assert.equal(normalizePhone('6281234567890'), '6281234567890');
});

test('formatPhoneDisplay converts 62 to 08', () => {
  assert.equal(formatPhoneDisplay('6281234567890'), '081234567890');
});

test('isValidIndonesianMobilePhone accepts valid mobile formats', () => {
  assert.equal(isValidIndonesianMobilePhone('081234567890'), true);
  assert.equal(isValidIndonesianMobilePhone('6281234567890'), true);
  assert.equal(isValidIndonesianMobilePhone('62987383787334'), false);
  assert.equal(isValidIndonesianMobilePhone('12345'), false);
});
