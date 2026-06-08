/** Delivery source — store direct (POS) vs online order */
export type DeliveryType = 'STORE_DIRECT' | 'ONLINE_ORDER';

/** Delivery order status — POS shipment queue */
export type DeliveryStatus =
  | 'MENUNGGU'
  | 'DISIAPKAN'
  | 'DIKIRIM'
  | 'SELESAI'
  | 'BATAL';

export interface DeliveryAddressSnapshot {
  label: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  province?: string | null;
  postalCode?: string | null;
}

export interface DeliveryOrderListItem {
  id: string;
  deliveryNo: string;
  deliveryType: DeliveryType;
  deliveryTypeLabel: string;
  status: DeliveryStatus;
  statusLabel: string;
  createdAt: string;
  scheduledAt: string | null;
  driverName: string | null;
  notes: string | null;
  customer: { id: string; name: string; phone: string };
  addressSnippet: string;
  outlet: { id: string; name: string };
  transaction: { id: string; receiptNo: string; total: number } | null;
  itemCount: number;
}

export interface DeliveryOrderDetail extends DeliveryOrderListItem {
  address: DeliveryAddressSnapshot;
  cancelReason: string | null;
  items: Array<{
    productName: string;
    quantity: number;
    sellUnitSymbol: string | null;
    subtotal: number;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: DeliveryStatus | null;
    toStatus: DeliveryStatus;
    fromStatusLabel: string | null;
    toStatusLabel: string;
    notes: string | null;
    changedByName: string;
    createdAt: string;
  }>;
}

export interface DeliveryQueueSummary {
  MENUNGGU: number;
  DISIAPKAN: number;
  DIKIRIM: number;
  SELESAI: number;
  BATAL: number;
  total: number;
}
