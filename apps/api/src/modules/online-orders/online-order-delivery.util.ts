import type { DeliveryStatus } from '@barokah/shared';

export interface OnlineDeliveryAddressJson {
  street?: string;
  district?: string;
  city?: string;
  postalCode?: string;
}

export function parseOnlineDeliveryAddress(address: unknown): OnlineDeliveryAddressJson | null {
  if (!address || typeof address !== 'object') {
    return null;
  }
  const row = address as OnlineDeliveryAddressJson;
  if (!row.street?.trim() || !row.city?.trim()) {
    return null;
  }
  return {
    street: row.street.trim(),
    district: row.district?.trim() || undefined,
    city: row.city.trim(),
    postalCode: row.postalCode?.trim() || undefined,
  };
}

export function formatOnlineDeliveryAddressFull(address: unknown): string | null {
  const parsed = parseOnlineDeliveryAddress(address);
  if (!parsed) {
    return null;
  }
  const parts = [parsed.street, parsed.district, parsed.city, parsed.postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export function mapOnlineAddressToDeliveryFields(address: unknown) {
  const parsed = parseOnlineDeliveryAddress(address);
  if (!parsed) {
    return null;
  }
  return {
    label: 'Pengiriman Online',
    addressLine1: parsed.street!,
    addressLine2: parsed.district ?? null,
    city: parsed.city!,
    province: null as string | null,
    postalCode: parsed.postalCode ?? null,
  };
}

/** Maps online order READY/CONFIRMED to delivery queue status. */
export function targetDeliveryStatusForOnlineOrder(
  orderStatus: string,
  action?: 'ship',
): DeliveryStatus | null {
  if (action === 'ship') {
    return 'DIKIRIM';
  }
  if (orderStatus === 'CONFIRMED') {
    return 'MENUNGGU';
  }
  if (orderStatus === 'READY') {
    return 'DISIAPKAN';
  }
  if (orderStatus === 'COMPLETED') {
    return 'SELESAI';
  }
  return null;
}
