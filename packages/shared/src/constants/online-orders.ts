import type { OnlineOrderChannel } from '../types/delivery-types';

/** MVP flat delivery fee (IDR integer) — synced storefront + API. */
export const ONLINE_DELIVERY_FLAT_FEE = 25_000;

export const ONLINE_ORDER_CHANNEL_LABELS: Record<OnlineOrderChannel, string> = {
  WEB: 'Order Web',
  TOKOPEDIA: 'Tokopedia',
  SHOPEE: 'Shopee',
  OTHER: 'Marketplace Lain',
};

export const ONLINE_ORDER_CHANNEL_BADGE: Record<
  OnlineOrderChannel,
  { bg: string; color: string; icon: string }
> = {
  WEB: { bg: '#DBEAFE', color: '#1D4ED8', icon: '🌐' },
  TOKOPEDIA: { bg: '#ECFDF5', color: '#047857', icon: '🛒' },
  SHOPEE: { bg: '#FFF7ED', color: '#C2410C', icon: '🛒' },
  OTHER: { bg: '#F3E8FF', color: '#7E22CE', icon: '🛒' },
};

/** Comma-separated channel filter for marketplace POS queue */
export const MARKETPLACE_ORDER_CHANNELS = 'TOKOPEDIA,SHOPEE,OTHER' as const;
