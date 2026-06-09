import type { OnlineCodPaymentSummary } from '../utils/online-cod';

/** Sales channel for purchase / transaction list (dashboard Daftar Pembelian). */
export type SaleSourceType = 'TOKO' | 'WEB' | 'MARKETPLACE';

/** Unified list row — POS transaction or standalone online order. */
export type SaleRecordType = 'TRANSACTION' | 'ONLINE_ORDER';

/** Display status for purchase list badges. */
export type SaleDisplayStatus = 'COMPLETED' | 'VOID' | 'REFUND' | 'PARTIAL' | 'IN_PROGRESS' | 'CANCELLED';

export interface SalePurchaseListItem {
  id: string;
  recordType: SaleRecordType;
  receiptNo: string;
  sourceType: SaleSourceType;
  sourceLabel: string;
  customerName: string | null;
  total: number;
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  status: string;
  displayStatus: SaleDisplayStatus;
  displayStatusLabel: string;
  outletId: string;
  outletName: string;
  completedAt: string | null;
  cashierName: string | null;
  transactionId: string | null;
  onlineOrderId: string | null;
  deliveryId: string | null;
  receivableId: string | null;
  canVoid: boolean;
  canReprint: boolean;
  codPayment?: OnlineCodPaymentSummary | null;
}
