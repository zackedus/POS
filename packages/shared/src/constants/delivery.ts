import type { DeliveryStatus } from '../types/delivery-types';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  MENUNGGU: 'Menunggu',
  DISIAPKAN: 'Disiapkan',
  DIKIRIM: 'Dikirim',
  SELESAI: 'Selesai',
  BATAL: 'Batal',
};

/** Allowed status transitions for POS delivery queue */
export const DELIVERY_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  MENUNGGU: ['DISIAPKAN', 'BATAL'],
  DISIAPKAN: ['DIKIRIM', 'BATAL'],
  DIKIRIM: ['SELESAI', 'BATAL'],
  SELESAI: [],
  BATAL: [],
};
