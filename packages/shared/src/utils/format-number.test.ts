import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatNumberID, parseQuantityInput } from './format-number';

test('formatNumberID formats Indonesian numbers', () => {
  assert.equal(formatNumberID(1000), '1.000');
  assert.equal(formatNumberID(1.5), '1,5');
  assert.equal(formatNumberID(1.5, 2), '1,50');
  assert.equal(formatNumberID(0.5), '0,5');
});

test('parseQuantityInput accepts comma and dot decimals', () => {
  assert.equal(parseQuantityInput(''), 0);
  assert.equal(parseQuantityInput('1'), 1);
  assert.equal(parseQuantityInput('1,5'), 1.5);
  assert.equal(parseQuantityInput('0,5'), 0.5);
  assert.equal(parseQuantityInput('0.5'), 0.5);
  assert.equal(parseQuantityInput('1.000'), 1000);
  assert.equal(parseQuantityInput('2,25'), 2.25);
});
