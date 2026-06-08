import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDeliveryStatusDto } from './delivery.dto';

async function assertValid(payload: Record<string, unknown>) {
  const dto = plainToInstance(UpdateDeliveryStatusDto, payload);
  const errors = await validate(dto);
  assert.equal(errors.length, 0, JSON.stringify(errors, null, 2));
}

async function assertInvalid(payload: Record<string, unknown>, field: string) {
  const dto = plainToInstance(UpdateDeliveryStatusDto, payload);
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === field));
}

test('UpdateDeliveryStatusDto: accepts each valid status transition payload', async () => {
  await assertValid({ status: 'DISIAPKAN' });
  await assertValid({ status: 'DIKIRIM', driverName: 'Budi' });
  await assertValid({ status: 'SELESAI' });
  await assertValid({ status: 'BATAL', cancelReason: 'Pelanggan pindah alamat' });
});

test('UpdateDeliveryStatusDto: rejects Indonesian UI label instead of enum', async () => {
  await assertInvalid({ status: 'Disiapkan' }, 'status');
  await assertInvalid({ status: 'Menunggu' }, 'status');
});

test('UpdateDeliveryStatusDto: requires cancelReason when status is BATAL', async () => {
  await assertInvalid({ status: 'BATAL' }, 'cancelReason');
  await assertInvalid({ status: 'BATAL', cancelReason: 'ab' }, 'cancelReason');
});

test('UpdateDeliveryStatusDto: rejects unknown fields (whitelist)', async () => {
  const dto = plainToInstance(UpdateDeliveryStatusDto, {
    status: 'DISIAPKAN',
    statusLabel: 'Disiapkan',
  });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  assert.ok(errors.length > 0);
});
