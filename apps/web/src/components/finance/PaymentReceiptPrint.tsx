'use client';

import {
  formatCurrencyIDR,
  PAYMENT_RECEIPT_KIND_TITLES,
  RECEIVABLE_PAYMENT_METHOD_LABELS,
  type PaymentReceiptView,
} from '@barokah/shared';

export interface PaymentReceiptPrintProps {
  receipt: PaymentReceiptView;
  className?: string;
}

/** Printable payment receipt preview (use with window.print() or payment-receipt-print helper). */
export function PaymentReceiptPrint({ receipt, className }: PaymentReceiptPrintProps) {
  const title = PAYMENT_RECEIPT_KIND_TITLES[receipt.kind];
  const methodLabel = RECEIVABLE_PAYMENT_METHOD_LABELS[receipt.method] ?? receipt.method;

  return (
    <article
      className={className}
      data-testid="payment-receipt-print"
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 360,
        margin: '0 auto',
        color: '#111',
        padding: '1rem',
      }}
    >
      <h1 style={{ fontSize: '1rem', margin: '0 0 0.15rem', textAlign: 'center' }}>{receipt.storeName}</h1>
      {receipt.outletName ? (
        <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center', margin: '0 0 0.75rem' }}>
          {receipt.outletName}
        </p>
      ) : null}
      <h2 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem', textAlign: 'center', fontWeight: 600 }}>
        {title}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <tbody>
          <ReceiptRow label="Nomor bukti" value={receipt.receiptNumber} />
          <ReceiptRow label="Tanggal" value={new Date(receipt.createdAt).toLocaleString('id-ID')} />
          <ReceiptRow
            label={receipt.kind === 'PAYABLE_PAYMENT' ? 'Supplier' : 'Pelanggan'}
            value={receipt.counterpartyName}
          />
          {receipt.counterpartyPhone ? <ReceiptRow label="Telepon" value={receipt.counterpartyPhone} /> : null}
          {receipt.referenceLabel ? <ReceiptRow label="Referensi" value={receipt.referenceLabel} /> : null}
          <ReceiptRow label="Metode" value={methodLabel} />
          {receipt.transferReference ? (
            <ReceiptRow label="No. Ref TF" value={receipt.transferReference} />
          ) : null}
          {receipt.bankName ? <ReceiptRow label="Bank" value={receipt.bankName} /> : null}
          {receipt.balanceBefore != null && receipt.balanceAfter != null ? (
            <>
              <ReceiptRow label="Saldo sebelum" value={formatCurrencyIDR(receipt.balanceBefore)} />
              <ReceiptRow label="Saldo sesudah" value={formatCurrencyIDR(receipt.balanceAfter)} />
            </>
          ) : null}
          {receipt.outstandingBefore != null && receipt.outstandingAfter != null ? (
            <>
              <ReceiptRow label="Sisa sebelum" value={formatCurrencyIDR(receipt.outstandingBefore)} />
              <ReceiptRow label="Sisa sesudah" value={formatCurrencyIDR(receipt.outstandingAfter)} />
            </>
          ) : null}
          <ReceiptRow label="Nominal bayar" value={formatCurrencyIDR(receipt.amount)} emphasize />
          <ReceiptRow label="Petugas" value={receipt.recordedByName} />
          {receipt.notes ? <ReceiptRow label="Catatan" value={receipt.notes} /> : null}
        </tbody>
      </table>
      <p
        style={{
          marginTop: '1rem',
          fontSize: '0.7rem',
          color: '#64748b',
          textAlign: 'center',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '0.75rem',
        }}
      >
        Dokumen ini bukti pembayaran sah.
      </p>
    </article>
  );
}

function ReceiptRow({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <tr>
      <td style={{ padding: '0.35rem 0', color: '#64748b', verticalAlign: 'top', width: '42%' }}>{label}</td>
      <td
        style={{
          padding: '0.35rem 0',
          textAlign: 'right',
          fontWeight: emphasize ? 700 : 600,
          fontSize: emphasize ? '1rem' : undefined,
          borderTop: emphasize ? '1px dashed #cbd5e1' : undefined,
        }}
      >
        {value}
      </td>
    </tr>
  );
}
