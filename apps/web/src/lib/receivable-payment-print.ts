import type { PaymentReceiptView, ReceivablePaymentView } from '@barokah/shared';
import { RECEIVABLE_PAYMENT_METHOD_LABELS } from '@barokah/shared';
import { printPaymentReceipt } from './payment-receipt-print';

export function receivablePaymentToReceipt(params: {
  payment: ReceivablePaymentView;
  customerName: string;
  customerPhone?: string;
  storeName?: string;
  outletName?: string | null;
}): PaymentReceiptView {
  const { payment, customerName, customerPhone, storeName = 'Barokah Core POS', outletName } = params;
  const outstandingAfter = payment.receivable?.outstanding ?? null;
  const outstandingBefore =
    outstandingAfter != null ? outstandingAfter + payment.amount : null;

  return {
    receiptNumber: payment.receiptNumber ?? `BKT-REC-${payment.id.slice(0, 8).toUpperCase()}`,
    kind: 'RECEIVABLE_PAYMENT',
    amount: payment.amount,
    method: payment.method,
    createdAt: payment.createdAt,
    recordedByName: payment.recordedBy.fullName,
    counterpartyName: customerName,
    counterpartyPhone: customerPhone ?? null,
    storeName,
    outletName: outletName ?? null,
    outstandingBefore,
    outstandingAfter,
    transferReference: payment.transferReference,
    bankName: payment.bankName,
    notes: payment.notes,
    referenceLabel: payment.receivable?.transactionReceiptNo ?? payment.receivableId.slice(0, 8),
    paymentId: payment.id,
  };
}

export function printReceivablePaymentReceipt(params: {
  payment: ReceivablePaymentView;
  customerName: string;
  customerPhone?: string;
  storeName?: string;
  outletName?: string | null;
}): void {
  printPaymentReceipt(receivablePaymentToReceipt(params));
}

export function exportPaymentHistoryCsv(
  payments: ReceivablePaymentView[],
  filenamePrefix = 'riwayat-pembayaran-piutang',
): void {
  const lines = [
    'Tanggal,Nomor Bukti,Metode,Nominal,Ref TF,Bank,Bukti URL,Petugas,Ref Piutang,Catatan',
  ];
  for (const p of payments) {
    lines.push(
      [
        new Date(p.createdAt).toLocaleString('id-ID'),
        p.receiptNumber ?? '',
        RECEIVABLE_PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        p.amount,
        `"${(p.transferReference ?? '').replace(/"/g, '""')}"`,
        `"${(p.bankName ?? '').replace(/"/g, '""')}"`,
        p.proofUrl ?? '',
        `"${p.recordedBy.fullName.replace(/"/g, '""')}"`,
        p.receivable?.transactionReceiptNo ?? p.receivableId.slice(0, 8),
        `"${(p.notes ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
