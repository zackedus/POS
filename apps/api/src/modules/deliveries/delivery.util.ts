import type { DeliveryStatus } from '@barokah/shared';
import { DELIVERY_STATUS_LABELS } from '@barokah/shared';

const JAKARTA_TZ = 'Asia/Jakarta';

export function getJakartaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TZ }).format(date);
}

export function buildDeliveryNo(dateKey: string, sequence: number): string {
  const compact = dateKey.replace(/-/g, '');
  return `DLV-${compact}-${String(sequence).padStart(4, '0')}`;
}

export function deliveryStatusLabel(status: DeliveryStatus): string {
  return DELIVERY_STATUS_LABELS[status] ?? status;
}

export function formatAddressSnippet(parts: {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province?: string | null;
}): string {
  const segments = [parts.addressLine1];
  if (parts.addressLine2?.trim()) {
    segments.push(parts.addressLine2.trim());
  }
  segments.push(parts.city);
  if (parts.province?.trim()) {
    segments.push(parts.province.trim());
  }
  return segments.join(', ');
}
