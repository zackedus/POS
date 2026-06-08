import type { DeliveryStatus } from '@barokah/shared';

export type DeliveryStatusVariant = 'neutral' | 'warning' | 'success' | 'error' | 'info';

/** PATCH /deliveries/:id/status — must use API enum values, not UI labels. */
export interface UpdateDeliveryStatusPayload {
  status: DeliveryStatus;
  driverName?: string;
  scheduledAt?: string;
  notes?: string;
  cancelReason?: string;
}

export function buildUpdateDeliveryStatusPayload(params: {
  status: DeliveryStatus;
  driverName?: string;
  cancelReason?: string;
  notes?: string;
  scheduledAt?: string;
}): UpdateDeliveryStatusPayload {
  const payload: UpdateDeliveryStatusPayload = { status: params.status };

  const driver = params.driverName?.trim();
  if (driver) {
    payload.driverName = driver;
  }

  if (params.status === 'BATAL') {
    const reason = params.cancelReason?.trim();
    if (reason) {
      payload.cancelReason = reason;
    }
  }

  const notes = params.notes?.trim();
  if (notes) {
    payload.notes = notes;
  }

  if (params.scheduledAt) {
    payload.scheduledAt = params.scheduledAt;
  }

  return payload;
}

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
