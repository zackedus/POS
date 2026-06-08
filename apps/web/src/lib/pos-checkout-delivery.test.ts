import { describe, expect, it } from 'vitest';
import { buildDeliveryOrderPayload, toCheckoutCustomerPhone } from './pos-checkout-delivery';

describe('pos-checkout-delivery', () => {
  it('builds saved address delivery payload', () => {
    const payload = buildDeliveryOrderPayload({
      transactionId: 'trx-1',
      customerId: 'cust-1',
      outletId: 'outlet-1',
      selection: {
        mode: 'saved',
        addressId: 'addr-1',
        snapshot: {
          id: 'addr-1',
          label: 'Proyek',
          addressLine1: 'Jl. Merdeka 1',
          addressLine2: null,
          city: 'Jakarta',
          province: 'DKI',
          postalCode: null,
          isDefault: true,
          createdAt: '',
          updatedAt: '',
        },
      },
      notes: 'Lantai 2',
    });

    expect(payload.transactionId).toBe('trx-1');
    expect(payload.deliveryType).toBe('STORE_DIRECT');
    expect(payload.addressId).toBe('addr-1');
    expect(payload.notes).toBe('Lantai 2');
    expect(payload.addressSnapshot).toBeUndefined();
  });

  it('builds manual address snapshot payload without customerId for walk-in delivery', () => {
    const payload = buildDeliveryOrderPayload({
      transactionId: 'trx-walkin-1',
      selection: {
        mode: 'manual',
        snapshot: {
          id: 'manual',
          label: 'Proyek',
          addressLine1: 'Jl. Proyek 5',
          addressLine2: 'Kel. Sukamaju',
          city: 'Bekasi',
          province: null,
          postalCode: '17121',
          isDefault: false,
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    expect(payload.customerId).toBeUndefined();
    expect(payload.transactionId).toBe('trx-walkin-1');
    expect(payload.addressSnapshot?.addressLine2).toBe('Kel. Sukamaju');
  });

  it('includes walk-in customer fields when customerId is missing', () => {
    const payload = buildDeliveryOrderPayload({
      transactionId: 'trx-walkin-2',
      customerName: 'Pak Joko',
      customerPhone: '62812987654321',
      selection: {
        mode: 'manual',
        snapshot: {
          id: 'manual',
          label: 'Proyek',
          addressLine1: 'Jl. Merdeka 10',
          addressLine2: null,
          city: 'Jakarta',
          province: null,
          postalCode: null,
          isDefault: false,
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    expect(payload.customerName).toBe('Pak Joko');
    expect(payload.customerPhone).toBe('0812987654321');
  });

  it('normalizes checkout phone to local 08 format', () => {
    expect(toCheckoutCustomerPhone('6281234567890')).toBe('081234567890');
    expect(toCheckoutCustomerPhone('0812-3456-7890')).toBe('081234567890');
  });

  it('builds manual address snapshot payload', () => {
    const payload = buildDeliveryOrderPayload({
      transactionId: 'trx-2',
      customerId: 'cust-2',
      selection: {
        mode: 'manual',
        snapshot: {
          id: 'manual',
          label: 'Proyek',
          addressLine1: 'Jl. Proyek 5',
          addressLine2: 'Gudang B',
          city: 'Bekasi',
          province: 'Jabar',
          postalCode: '17121',
          isDefault: false,
          createdAt: '',
          updatedAt: '',
        },
      },
    });

    expect(payload.addressId).toBeUndefined();
    expect(payload.addressSnapshot).toEqual({
      label: 'Proyek',
      addressLine1: 'Jl. Proyek 5',
      addressLine2: 'Gudang B',
      city: 'Bekasi',
      province: 'Jabar',
      postalCode: '17121',
    });
  });
});
