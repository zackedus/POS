export enum StockAdjustReason {
  OPNAME = 'OPNAME',
  GIFT = 'GIFT',
  TRANSFER_IN = 'TRANSFER_IN',
  DAMAGED = 'DAMAGED',
  SAMPLE = 'SAMPLE',
  TRANSFER_OUT = 'TRANSFER_OUT',
  OTHER = 'OTHER',
}

export const STOCK_ADJUST_REASON_LABELS: Record<StockAdjustReason, string> = {
  [StockAdjustReason.OPNAME]: 'Penyesuaian opname',
  [StockAdjustReason.GIFT]: 'Hadiah / bonus masuk',
  [StockAdjustReason.TRANSFER_IN]: 'Transfer masuk antar cabang',
  [StockAdjustReason.DAMAGED]: 'Barang rusak',
  [StockAdjustReason.SAMPLE]: 'Sample / promosi',
  [StockAdjustReason.TRANSFER_OUT]: 'Transfer keluar antar cabang',
  [StockAdjustReason.OTHER]: 'Lainnya',
};
