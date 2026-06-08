import { formatCurrencyIDR, RECEIVABLE_PAYMENT_METHOD_LABELS } from '@barokah/shared';
import type { ReceivablePaymentView } from '@barokah/shared';

export function printReceivablePaymentReceipt(params: {
  payment: ReceivablePaymentView;
  customerName: string;
  customerPhone?: string;
  storeName?: string;
}): void {
  const { payment, customerName, customerPhone, storeName = 'Barokah Core POS' } = params;
  const methodLabel = RECEIVABLE_PAYMENT_METHOD_LABELS[payment.method] ?? payment.method;
  const ref = payment.receivable?.transactionReceiptNo ?? payment.receivableId.slice(0, 8);
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Bukti Pembayaran Piutang</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 320px; margin: 1rem auto; color: #111; }
    h1 { font-size: 1rem; margin: 0 0 0.25rem; text-align: center; }
    .muted { color: #64748b; font-size: 0.75rem; text-align: center; margin-bottom: 1rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
    td { padding: 0.35rem 0; vertical-align: top; }
    td:last-child { text-align: right; font-weight: 600; }
    .total td { border-top: 1px dashed #cbd5e1; padding-top: 0.5rem; font-size: 1rem; }
    .footer { margin-top: 1rem; font-size: 0.7rem; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <h1>${storeName}</h1>
  <p class="muted">Bukti Pembayaran Piutang</p>
  <table>
    <tr><td>Tanggal</td><td>${new Date(payment.createdAt).toLocaleString('id-ID')}</td></tr>
    <tr><td>Pelanggan</td><td>${escapeHtml(customerName)}</td></tr>
    ${customerPhone ? `<tr><td>Telepon</td><td>${escapeHtml(customerPhone)}</td></tr>` : ''}
    <tr><td>Ref Piutang</td><td>${escapeHtml(ref)}</td></tr>
    <tr><td>Metode</td><td>${escapeHtml(methodLabel)}</td></tr>
    ${payment.transferReference ? `<tr><td>No. Ref TF</td><td>${escapeHtml(payment.transferReference)}</td></tr>` : ''}
    ${payment.bankName ? `<tr><td>Bank</td><td>${escapeHtml(payment.bankName)}</td></tr>` : ''}
    <tr class="total"><td>Nominal</td><td>${formatCurrencyIDR(payment.amount)}</td></tr>
    <tr><td>Petugas</td><td>${escapeHtml(payment.recordedBy.fullName)}</td></tr>
    ${payment.notes ? `<tr><td>Catatan</td><td>${escapeHtml(payment.notes)}</td></tr>` : ''}
  </table>
  <p class="footer">Dokumen ini dicetak otomatis — tidak perlu tanda tangan.</p>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportPaymentHistoryCsv(
  payments: ReceivablePaymentView[],
  filenamePrefix = 'riwayat-pembayaran-piutang',
): void {
  const lines = [
    'Tanggal,Metode,Nominal,Ref TF,Bank,Bukti URL,Petugas,Ref Piutang,Catatan',
  ];
  for (const p of payments) {
    lines.push(
      [
        new Date(p.createdAt).toLocaleString('id-ID'),
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
