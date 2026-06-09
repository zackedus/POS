import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaginationMeta, resolvePagination } from './pagination.util';

test('resolvePagination applies defaults and max limit', () => {
  const result = resolvePagination({});
  assert.equal(result.page, 1);
  assert.equal(result.limit, 25);
  assert.equal(result.skip, 0);
});

test('resolvePagination caps limit at 100', () => {
  const result = resolvePagination({ page: 2, limit: 500 });
  assert.equal(result.page, 2);
  assert.equal(result.limit, 100);
  assert.equal(result.skip, 100);
});

test('buildPaginationMeta computes totalPages', () => {
  const meta = buildPaginationMeta(2, 25, 60);
  assert.equal(meta.page, 2);
  assert.equal(meta.limit, 25);
  assert.equal(meta.total, 60);
  assert.equal(meta.totalPages, 3);
});
