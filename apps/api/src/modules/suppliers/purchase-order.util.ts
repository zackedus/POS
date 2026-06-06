export function buildPurchaseOrderNo(dateKey: string, sequence: number): string {
  const compact = dateKey.replace(/-/g, '');
  return `PO-${compact}-${String(sequence).padStart(4, '0')}`;
}

export function buildPurchaseOrderReturnNo(dateKey: string, sequence: number): string {
  const compact = dateKey.replace(/-/g, '');
  return `RET-${compact}-${String(sequence).padStart(4, '0')}`;
}

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const PO_RECEIVABLE_STATUSES = ['ORDERED', 'PARTIALLY_RECEIVED'] as const;
export const PO_EDITABLE_STATUSES = ['DRAFT'] as const;
export const PO_CANCELLABLE_STATUSES = ['DRAFT', 'ORDERED'] as const;
export const PO_RETURNABLE_STATUSES = ['PARTIALLY_RECEIVED', 'RECEIVED'] as const;
export const PO_CANCEL_REMAINING_STATUSES = ['ORDERED', 'PARTIALLY_RECEIVED'] as const;
