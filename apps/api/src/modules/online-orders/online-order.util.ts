import type { OnlineOrderStatus } from '@barokah/database';

const JAKARTA_TZ = 'Asia/Jakarta';
const PAYMENT_TTL_MINUTES = 60;

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('62')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`;
  }
  return digits;
}

export function formatPhoneDisplay(normalized: string): string {
  if (normalized.startsWith('62')) {
    return `0${normalized.slice(2)}`;
  }
  return normalized;
}

export function getJakartaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: JAKARTA_TZ }).format(date);
}

export function buildOrderNo(dateKey: string, sequence: number): string {
  const compact = dateKey.replace(/-/g, '');
  return `WEB-${compact}-${String(sequence).padStart(4, '0')}`;
}

export function paymentExpiresAt(from = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_TTL_MINUTES * 60 * 1000);
}

export function orderStatusLabel(status: OnlineOrderStatus | 'EXPIRED'): string {
  if (status === 'EXPIRED') {
    return 'Kedaluwarsa';
  }
  switch (status) {
    case 'NEW':
    case 'PENDING_PAYMENT':
      return 'Menunggu pembayaran';
    case 'PAID':
      return 'Sudah dibayar';
    case 'CONFIRMED':
      return 'Dikonfirmasi toko';
    case 'READY':
      return 'Siap diambil';
    case 'COMPLETED':
      return 'Selesai';
    case 'CANCELLED':
      return 'Dibatalkan';
    default:
      return status;
  }
}

export function fulfillmentTypeLabel(type: 'PICKUP' | 'DELIVERY'): string {
  return type === 'PICKUP' ? 'Ambil di toko' : 'Pengiriman';
}

export function formatDeliveryAddressSnippet(address: unknown): string | null {
  if (!address || typeof address !== 'object') {
    return null;
  }
  const row = address as { street?: string; district?: string; city?: string };
  const parts = [row.street, row.district, row.city].filter((part) => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(', ') : null;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<string, OnlineOrderStatus[]> = {
  PAID: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
};
