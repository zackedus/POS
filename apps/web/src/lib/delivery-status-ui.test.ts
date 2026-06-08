import { describe, expect, it } from 'vitest';
import { buildUpdateDeliveryStatusPayload } from './delivery-status-ui';

describe('buildUpdateDeliveryStatusPayload', () => {
  it('maps advance transitions to API enum values', () => {
    expect(buildUpdateDeliveryStatusPayload({ status: 'DISIAPKAN' })).toEqual({
      status: 'DISIAPKAN',
    });
    expect(buildUpdateDeliveryStatusPayload({ status: 'DIKIRIM', driverName: '  Budi  ' })).toEqual({
      status: 'DIKIRIM',
      driverName: 'Budi',
    });
    expect(buildUpdateDeliveryStatusPayload({ status: 'SELESAI' })).toEqual({
      status: 'SELESAI',
    });
  });

  it('includes cancelReason only for BATAL', () => {
    expect(
      buildUpdateDeliveryStatusPayload({
        status: 'BATAL',
        cancelReason: '  Pelanggan batal  ',
      }),
    ).toEqual({
      status: 'BATAL',
      cancelReason: 'Pelanggan batal',
    });

    expect(
      buildUpdateDeliveryStatusPayload({
        status: 'DISIAPKAN',
        cancelReason: 'should not appear',
      }),
    ).toEqual({
      status: 'DISIAPKAN',
    });
  });
});
