import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTodayDate, getTodayDateRange } from './date-range';

test('getTodayDate: returns ISO date string', () => {
  assert.match(getTodayDate('Asia/Jakarta'), /^\d{4}-\d{2}-\d{2}$/);
});

test('getTodayDate: WIB can differ from UTC calendar day near midnight', () => {
  const instant = new Date('2026-06-09T17:30:00.000Z');
  const utcDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  const jakartaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  assert.equal(utcDate, '2026-06-09');
  assert.equal(jakartaDate, '2026-06-10');
});

test('getTodayDateRange: from and to are the same day', () => {
  const range = getTodayDateRange('UTC');
  assert.equal(range.from, range.to);
  assert.match(range.from, /^\d{4}-\d{2}-\d{2}$/);
});
