import {
  MARKETPLACE_SALE_CHANNELS,
  SALE_DISPLAY_STATUS_LABELS,
  SALE_SOURCE_TYPE_LABELS,
  type SaleDisplayStatus,
  type SaleSourceType,
} from '@barokah/shared';

const MARKETPLACE_CHANNEL_SET = new Set<string>(MARKETPLACE_SALE_CHANNELS);

export function deriveSaleSourceFromOnlineChannel(channel: string | null | undefined): SaleSourceType {
  if (channel === 'WEB') return 'WEB';
  if (channel && MARKETPLACE_CHANNEL_SET.has(channel)) return 'MARKETPLACE';
  return 'TOKO';
}

export function deriveSaleSourceFromTransaction(row: {
  deliveryOrders: Array<{ onlineOrder: { channel: string } | null }>;
}): SaleSourceType {
  for (const delivery of row.deliveryOrders) {
    if (delivery.onlineOrder?.channel) {
      return deriveSaleSourceFromOnlineChannel(delivery.onlineOrder.channel);
    }
  }
  return 'TOKO';
}

export function deriveTransactionDisplayStatus(input: {
  status: string;
  adjustments: Array<{ type: string; amount: unknown }>;
  total: unknown;
}): { displayStatus: SaleDisplayStatus; displayStatusLabel: string } {
  if (input.status === 'VOID') {
    return { displayStatus: 'VOID', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.VOID };
  }
  if (input.status === 'REFUNDED') {
    return { displayStatus: 'REFUND', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.REFUND };
  }

  const refundTotal = input.adjustments
    .filter((row) => row.type === 'REFUND')
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const total = Number(input.total);

  if (refundTotal > 0 && refundTotal < total) {
    return { displayStatus: 'PARTIAL', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.PARTIAL };
  }
  if (refundTotal >= total && total > 0) {
    return { displayStatus: 'REFUND', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.REFUND };
  }

  return { displayStatus: 'COMPLETED', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.COMPLETED };
}

export function deriveOnlineOrderDisplayStatus(status: string): {
  displayStatus: SaleDisplayStatus;
  displayStatusLabel: string;
} {
  if (status === 'CANCELLED' || status === 'EXPIRED') {
    return { displayStatus: 'CANCELLED', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.CANCELLED };
  }
  if (status === 'COMPLETED') {
    return { displayStatus: 'COMPLETED', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.COMPLETED };
  }
  return { displayStatus: 'IN_PROGRESS', displayStatusLabel: SALE_DISPLAY_STATUS_LABELS.IN_PROGRESS };
}

export function saleSourceLabel(sourceType: SaleSourceType): string {
  return SALE_SOURCE_TYPE_LABELS[sourceType];
}

export function matchesSaleSourceFilter(
  sourceType: SaleSourceType,
  filter: 'ALL' | SaleSourceType | undefined,
): boolean {
  if (!filter || filter === 'ALL') return true;
  return sourceType === filter;
}

export function matchesDisplayStatusFilter(
  displayStatus: SaleDisplayStatus,
  filter: string | undefined,
): boolean {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'COMPLETED') return displayStatus === 'COMPLETED';
  if (filter === 'VOID') return displayStatus === 'VOID' || displayStatus === 'CANCELLED';
  if (filter === 'REFUND') return displayStatus === 'REFUND';
  if (filter === 'PARTIAL') return displayStatus === 'PARTIAL';
  if (filter === 'IN_PROGRESS') return displayStatus === 'IN_PROGRESS';
  return true;
}

export function buildTransactionSourceWhere(
  sourceType: 'ALL' | SaleSourceType | undefined,
): Record<string, unknown> | undefined {
  if (!sourceType || sourceType === 'ALL') return undefined;
  if (sourceType === 'TOKO') {
    return {
      NOT: {
        deliveryOrders: {
          some: { onlineOrderId: { not: null } },
        },
      },
    };
  }
  if (sourceType === 'WEB') {
    return {
      deliveryOrders: {
        some: { onlineOrder: { channel: 'WEB' } },
      },
    };
  }
  return {
    deliveryOrders: {
      some: { onlineOrder: { channel: { in: [...MARKETPLACE_SALE_CHANNELS] } } },
    },
  };
}

export function buildOnlineOrderChannelWhere(
  sourceType: 'ALL' | SaleSourceType | undefined,
): { channel: 'WEB' } | { channel: { in: ['TOKOPEDIA', 'SHOPEE', 'OTHER'] } } | { channel: { in: ['WEB', 'TOKOPEDIA', 'SHOPEE', 'OTHER'] } } | null {
  if (!sourceType || sourceType === 'TOKO') return null;
  if (sourceType === 'WEB') return { channel: 'WEB' };
  if (sourceType === 'MARKETPLACE') return { channel: { in: ['TOKOPEDIA', 'SHOPEE', 'OTHER'] } };
  return { channel: { in: ['WEB', 'TOKOPEDIA', 'SHOPEE', 'OTHER'] } };
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  E_WALLET: 'E-Wallet',
  CARD: 'Kartu',
  CREDIT: 'Tempo / Piutang',
  DEPOSIT: 'Deposit',
};

export function summarizePaymentMethods(methods: string[]): {
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
} {
  const unique = [...new Set(methods.filter(Boolean))];
  if (unique.length === 0) {
    return { paymentMethod: null, paymentMethodLabel: null };
  }
  if (unique.length === 1) {
    const method = unique[0]!;
    return { paymentMethod: method, paymentMethodLabel: PAYMENT_METHOD_LABELS[method] ?? method };
  }
  return {
    paymentMethod: 'SPLIT',
    paymentMethodLabel: unique.map((m) => PAYMENT_METHOD_LABELS[m] ?? m).join(' + '),
  };
}

export function onlineOrderPaymentLabel(paymentType: string | null | undefined): string {
  if (!paymentType) return 'Pembayaran Online';
  const normalized = paymentType.toUpperCase();
  if (normalized.includes('QRIS')) return 'QRIS';
  if (normalized.includes('BANK') || normalized.includes('TRANSFER')) return 'Transfer';
  if (normalized.includes('GOPAY') || normalized.includes('SHOPEEPAY')) return 'E-Wallet';
  return 'Pembayaran Online';
}
