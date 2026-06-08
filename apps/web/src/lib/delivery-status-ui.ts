import type { DeliveryStatus } from '@barokah/shared';

export type DeliveryStatusVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

export function deliveryStatusVariant(status: DeliveryStatus): DeliveryStatusVariant {
  if (status === 'SELESAI') return 'success';
  if (status === 'BATAL') return 'neutral';
  if (status === 'MENUNGGU') return 'warning';
  if (status === 'DISIAPKAN') return 'info';
  return 'neutral';
}

/** Purple badge style for DIKIRIM — StatusBadge has no purple variant. */
export function deliveryStatusExtraStyle(status: DeliveryStatus): Record<string, string> | undefined {
  if (status === 'DIKIRIM') {
    return { background: '#f3e8ff', color: '#6b21a8' };
  }
  return undefined;
}
