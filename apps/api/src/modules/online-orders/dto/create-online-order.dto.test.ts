import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOnlineOrderDto } from './create-online-order.dto';

const BASE = {
  clientRequestId: 'req-test-12345678',
  outletId: '550e8400-e29b-41d4-a716-446655440000',
  customer: { name: 'Budi Proyek', phone: '081234567890' },
  items: [{ productId: '660e8400-e29b-41d4-a716-446655440001', quantity: 1 }],
};

const DELIVERY_ADDRESS = {
  street: 'Jl. Merdeka No. 10',
  district: 'Menteng',
  city: 'Jakarta Pusat',
  postalCode: '10110',
};

async function assertValid(payload: Record<string, unknown>) {
  const dto = plainToInstance(CreateOnlineOrderDto, payload);
  const errors = await validate(dto);
  assert.equal(errors.length, 0, JSON.stringify(errors, null, 2));
}

async function assertInvalid(payload: Record<string, unknown>, field: string) {
  const dto = plainToInstance(CreateOnlineOrderDto, payload);
  const errors = await validate(dto);
  assert.ok(errors.some((error) => error.property === field), JSON.stringify(errors, null, 2));
}

test('CreateOnlineOrderDto: DELIVERY with customerAddressId does not require deliveryAddress', async () => {
  await assertValid({
    ...BASE,
    fulfillmentType: 'DELIVERY',
    customerAddressId: '770e8400-e29b-41d4-a716-446655440002',
  });
});

test('CreateOnlineOrderDto: DELIVERY COD with customerAddressId is valid', async () => {
  await assertValid({
    ...BASE,
    fulfillmentType: 'DELIVERY',
    paymentMode: 'COD',
    customerAddressId: '770e8400-e29b-41d4-a716-446655440002',
  });
});

test('CreateOnlineOrderDto: DELIVERY without address fields fails validation', async () => {
  await assertInvalid({ ...BASE, fulfillmentType: 'DELIVERY' }, 'deliveryAddress');
});

test('CreateOnlineOrderDto: DELIVERY with inline deliveryAddress is valid', async () => {
  await assertValid({
    ...BASE,
    fulfillmentType: 'DELIVERY',
    deliveryAddress: DELIVERY_ADDRESS,
  });
});

test('CreateOnlineOrderDto: PICKUP does not require deliveryAddress', async () => {
  await assertValid({
    ...BASE,
    fulfillmentType: 'PICKUP',
  });
});
