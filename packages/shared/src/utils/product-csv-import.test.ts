import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductCsvTemplate, parseProductCsv } from './product-csv-import';

test('buildProductCsvTemplate includes headers and sample row', () => {
  const template = buildProductCsvTemplate();
  assert.match(template, /^sku,name,price,category,unit,stock/);
});

test('parseProductCsv validates required columns', () => {
  const result = parseProductCsv('sku,name\nA,Test');
  assert.ok(result.errors.some((e) => e.field === 'header'));
});

test('parseProductCsv parses valid rows', () => {
  const csv = `sku,name,price,category,unit,stock
SKU-1,Semen 40kg,65000,Bahan,sak,10
SKU-2,Paku 1kg,15000,Perkakas,kg,`;
  const result = parseProductCsv(csv);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].price, 65000);
  assert.equal(result.rows[0].stock, 10);
  assert.equal(result.rows[1].stock, undefined);
});

test('parseProductCsv reports row errors', () => {
  const csv = `sku,name,price,category,unit
,Produk,abc,Kat,sak`;
  const result = parseProductCsv(csv);
  assert.ok(result.errors.some((e) => e.field === 'sku'));
  assert.ok(result.errors.some((e) => e.field === 'price'));
});
