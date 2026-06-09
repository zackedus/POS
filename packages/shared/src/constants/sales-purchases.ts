import type { SaleDisplayStatus, SaleSourceType } from '../types/sales-purchase';

export const SALE_SOURCE_TYPE_LABELS: Record<SaleSourceType, string> = {
  TOKO: 'Toko POS',
  WEB: 'Order Web',
  MARKETPLACE: 'Marketplace',
};

export const SALE_SOURCE_TYPE_BADGE: Record<
  SaleSourceType,
  { bg: string; color: string; icon: string }
> = {
  TOKO: { bg: '#F0FDF4', color: '#15803D', icon: '🏪' },
  WEB: { bg: '#DBEAFE', color: '#1D4ED8', icon: '🌐' },
  MARKETPLACE: { bg: '#FFF7ED', color: '#C2410C', icon: '🛒' },
};

export const SALE_DISPLAY_STATUS_LABELS: Record<SaleDisplayStatus, string> = {
  COMPLETED: 'Selesai',
  VOID: 'Void',
  REFUND: 'Refund',
  PARTIAL: 'Partial Refund',
  IN_PROGRESS: 'Diproses',
  CANCELLED: 'Batal',
};

export const MARKETPLACE_SALE_CHANNELS = ['TOKOPEDIA', 'SHOPEE', 'OTHER'] as const;

export const SALE_SOURCE_TYPE_FILTER_VALUES = ['ALL', 'TOKO', 'WEB', 'MARKETPLACE'] as const;
export type SaleSourceTypeFilter = (typeof SALE_SOURCE_TYPE_FILTER_VALUES)[number];
