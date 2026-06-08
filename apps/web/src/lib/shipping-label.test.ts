import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay } from '@barokah/shared';
import type { ShippingLabelData } from '@/lib/online-orders-api';

function buildSampleLabel(): ShippingLabelData {
  return {
    orderNo: 'WEB-20260609-0001',
    orderDate: '2026-06-09T10:00:00.000Z',
    serviceName: 'Pengiriman Toko (Store Direct)',
    deliveryTypeLabel: 'Order Online',
    from: {
      storeName: 'Toko Bangunan Barokah',
      outletName: 'Cabang Utama',
      address: 'Jl. Raya No. 1, Bandung',
      phone: '6281234567890',
    },
    to: {
      name: 'Budi Santoso',
      phone: '6281234567890',
      address: 'Jl. Merdeka 10, Coblong, Bandung',
    },
    delivery: {
      deliveryNo: 'DLV-20260609-0001',
      status: 'DISIAPKAN',
      statusLabel: 'Disiapkan',
    },
    items: [{ productName: 'Semen 40kg', quantity: 2, sku: 'SMN-40' }],
    notes: 'Tolong hubungi sebelum kirim',
  };
}

describe('shipping label data', () => {
  it('includes from/to blocks for print layout', () => {
    const data = buildSampleLabel();
    expect(data.from.storeName).toContain('Barokah');
    expect(data.to.name).toBe('Budi Santoso');
    expect(formatPhoneDisplay(data.to.phone)).toMatch(/^0/);
    expect(data.items[0]?.productName).toBe('Semen 40kg');
    expect(data.delivery?.deliveryNo).toMatch(/^DLV-/);
  });
});
