import {
  formatCurrencyIDR,
  PAYMENT_RECEIPT_KIND_TITLES,
  RECEIVABLE_PAYMENT_METHOD_LABELS,
  type PaymentReceiptView,
} from '@barokah/shared';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPaymentReceiptHtml(receipt: PaymentReceiptView): string {
  const title = PAYMENT_RECEIPT_KIND_TITLES[receipt.kind];
  const methodLabel = RECEIVABLE_PAYMENT_METHOD_LABELS[receipt.method] ?? receipt.method;
  const dateLabel = new Date(receipt.createdAt).toLocaleString('id-ID');

  const balanceRows =
    receipt.balanceBefore != null && receipt.balanceAfter != null
      ? `<tr><td>Saldo sebelum</td><td>${formatCurrencyIDR(receipt.balanceBefore)}</td></tr>
         <tr><td>Saldo sesudah</td><td>${formatCurrencyIDR(receipt.balanceAfter)}</td></tr>`
      : '';

  const outstandingRows =
    receipt.outstandingBefore != null && receipt.outstandingAfter != null
      ? `<tr><td>Sisa sebelum</td><td>${formatCurrencyIDR(receipt.outstandingBefore)}</td></tr>
         <tr><td>Sisa sesudah</td><td>${formatCurrencyIDR(receipt.outstandingAfter)}</td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @media print {
      body { margin: 0; }
    }
    body { font-family: system-ui, sans-serif; max-width: 360px; margin: 1rem auto; color: #111; }
    h1 { font-size: 1rem; margin: 0 0 0.15rem; text-align: center; }
    h2 { font-size: 0.875rem; margin: 0 0 0.75rem; text-align: center; font-weight: 600; color: #334155; }
    .muted { color: #64748b; font-size: 0.75rem; text-align: center; margin-bottom: 0.75rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    td { padding: 0.35rem 0; vertical-align: top; }
    td:first-child { color: #64748b; width: 42%; }
    td:last-child { text-align: right; font-weight: 600; }
    .total td { border-top: 1px dashed #cbd5e1; padding-top: 0.5rem; font-size: 1rem; }
    .footer { margin-top: 1rem; font-size: 0.7rem; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 0.75rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(receipt.storeName)}</h1>
  ${receipt.outletName ? `<p class="muted">${escapeHtml(receipt.outletName)}</p>` : ''}
  <h2>${escapeHtml(title)}</h2>
  <table>
    <tr><td>Nomor bukti</td><td>${escapeHtml(receipt.receiptNumber)}</td></tr>
    <tr><td>Tanggal</td><td>${dateLabel}</td></tr>
    <tr><td>${receipt.kind === 'PAYABLE_PAYMENT' ? 'Supplier' : 'Pelanggan'}</td><td>${escapeHtml(receipt.counterpartyName)}</td></tr>
    ${receipt.counterpartyPhone ? `<tr><td>Telepon</td><td>${escapeHtml(receipt.counterpartyPhone)}</td></tr>` : ''}
    ${receipt.referenceLabel ? `<tr><td>Referensi</td><td>${escapeHtml(receipt.referenceLabel)}</td></tr>` : ''}
    <tr><td>Metode</td><td>${escapeHtml(methodLabel)}</td></tr>
    ${receipt.transferReference ? `<tr><td>No. Ref TF</td><td>${escapeHtml(receipt.transferReference)}</td></tr>` : ''}
    ${receipt.bankName ? `<tr><td>Bank</td><td>${escapeHtml(receipt.bankName)}</td></tr>` : ''}
    ${balanceRows}
    ${outstandingRows}
    <tr class="total"><td>Nominal bayar</td><td>${formatCurrencyIDR(receipt.amount)}</td></tr>
    <tr><td>Petugas</td><td>${escapeHtml(receipt.recordedByName)}</td></tr>
    ${receipt.notes ? `<tr><td>Catatan</td><td>${escapeHtml(receipt.notes)}</td></tr>` : ''}
  </table>
  <p class="footer">Dokumen ini bukti pembayaran sah.</p>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
}

export function printPaymentReceipt(receipt: PaymentReceiptView): void {
  const html = buildPaymentReceiptHtml(receipt);
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}
