import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCreditDueDate } from './credit-due-date';

test('computeCreditDueDate: adds terms days in UTC', () => {
  const from = new Date('2026-06-09T15:30:00.000Z');
  assert.equal(computeCreditDueDate(7, from), '2026-06-16');
  assert.equal(computeCreditDueDate(14, from), '2026-06-23');
  assert.equal(computeCreditDueDate(30, from), '2026-07-09');
});

test('computeCreditDueDate: falls back to 30 for invalid terms', () => {
  const from = new Date('2026-06-09T00:00:00.000Z');
  assert.equal(computeCreditDueDate(99, from), '2026-07-09');
});
