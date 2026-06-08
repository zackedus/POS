import { describe, expect, it } from 'vitest';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_TRANSITIONS, DELIVERY_TYPE_LABELS } from '@barokah/shared';

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
