import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_TRANSITIONS, DELIVERY_TYPE_LABELS } from '@barokah/shared';
import { updateDeliveryStatus } from './deliveries-api';

const authApiJsonMock = vi.fn();

vi.mock('./api-client', () => ({
  authApiJson: (...args: unknown[]) => authApiJsonMock(...args),
}));

describe('delivery constants', () => {
  it('labels all statuses in Indonesian', () => {
    expect(DELIVERY_STATUS_LABELS.MENUNGGU).toBe('Menunggu');
    expect(DELIVERY_STATUS_LABELS.SELESAI).toBe('Selesai');
  });

  it('labels delivery types in Indonesian', () => {
    expect(DELIVERY_TYPE_LABELS.STORE_DIRECT).toBe('Toko Langsung');
    expect(DELIVERY_TYPE_LABELS.ONLINE_ORDER).toBe('Order Online');
  });

  it('allows linear progression from MENUNGGU to SELESAI', () => {
    expect(DELIVERY_STATUS_TRANSITIONS.MENUNGGU).toContain('DISIAPKAN');
    expect(DELIVERY_STATUS_TRANSITIONS.DISIAPKAN).toContain('DIKIRIM');
    expect(DELIVERY_STATUS_TRANSITIONS.DIKIRIM).toContain('SELESAI');
  });
});

describe('updateDeliveryStatus', () => {
  beforeEach(() => {
    authApiJsonMock.mockReset();
    authApiJsonMock.mockResolvedValue({ id: 'delivery-1', status: 'DISIAPKAN' });
  });

  it('sends JSON body with Content-Type and enum status', async () => {
    await updateDeliveryStatus(
      'delivery-1',
      { status: 'DISIAPKAN', driverName: 'Budi' },
      'outlet-2',
    );

    expect(authApiJsonMock).toHaveBeenCalledWith(
      expect.stringContaining('/deliveries/delivery-1/status?outletId=outlet-2'),
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISIAPKAN', driverName: 'Budi' }),
      }),
      'Gagal memperbarui status pengiriman.',
    );
  });

  it('sends cancelReason for BATAL transition', async () => {
    await updateDeliveryStatus(
      'delivery-1',
      { status: 'BATAL', cancelReason: 'Pelanggan tidak di lokasi' },
      'outlet-1',
    );

    expect(authApiJsonMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          status: 'BATAL',
          cancelReason: 'Pelanggan tidak di lokasi',
        }),
      }),
      expect.any(String),
    );
  });
});
