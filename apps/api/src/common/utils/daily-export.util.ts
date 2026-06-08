import { PaymentMethod } from '@barokah/shared';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tunai',
  [PaymentMethod.TRANSFER]: 'Transfer',
  [PaymentMethod.QRIS]: 'QRIS',
  [PaymentMethod.E_WALLET]: 'E-Wallet',
  [PaymentMethod.CARD]: 'Kartu',
  [PaymentMethod.CREDIT]: 'Piutang/Tempo',
  [PaymentMethod.DEPOSIT]: 'Deposit',
};

type DailySalesExportPayload = {
  outletId: string;
  date: string;
  dateFrom?: string;
  dateTo?: string;
  isRange?: boolean;
  timezone: string;
  transactionCount: number;
  grossOmzet: number;
  voidRefundCount: number;
  voidRefundTotal: number;
  netOmzet: number;
  paymentMix: Array<{
    method: PaymentMethod;
    amount: number;
    count: number;
    sharePercent: number;
  }>;
};

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvRow(cells: Array<string | number>): string {
  return cells.map(escapeCsvCell).join(',');
}

export function buildDailySalesCsv(payload: DailySalesExportPayload): string {
  const lines: string[] = [
    csvRow(['Field', 'Value']),
    csvRow(['outletId', payload.outletId]),
    csvRow(['date', payload.date]),
    ...(payload.dateFrom && payload.dateTo
      ? [csvRow(['dateFrom', payload.dateFrom]), csvRow(['dateTo', payload.dateTo])]
      : []),
    csvRow(['timezone', payload.timezone]),
    csvRow(['transactionCount', payload.transactionCount]),
    csvRow(['grossOmzet', payload.grossOmzet]),
    csvRow(['voidRefundCount', payload.voidRefundCount]),
    csvRow(['voidRefundTotal', payload.voidRefundTotal]),
    csvRow(['netOmzet', payload.netOmzet]),
    '',
    csvRow(['Payment Method', 'Label', 'Amount (IDR)', 'Count', 'Share %']),
    ...payload.paymentMix.map((row) =>
      csvRow([
        row.method,
        PAYMENT_METHOD_LABELS[row.method] ?? row.method,
        row.amount,
        row.count,
        row.sharePercent,
      ]),
    ),
  ];

  return lines.join('\r\n');
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

/** Minimal single-page PDF (text-only) for daily/range sales export — no external deps. */
export function buildDailySalesPdf(payload: DailySalesExportPayload): Buffer {
  const title = payload.isRange ? 'Laporan Penjualan Rentang Tanggal' : 'Laporan Penjualan Harian';
  const periodLabel = payload.isRange && payload.dateFrom && payload.dateTo
    ? `${payload.dateFrom} s/d ${payload.dateTo}`
    : payload.date;

  const lines: string[] = [
    title,
    `Periode: ${periodLabel}`,
    `Outlet: ${payload.outletId}`,
    `Zona waktu: ${payload.timezone}`,
    '',
    `Jumlah transaksi: ${payload.transactionCount}`,
    `Omzet kotor: ${formatIdr(payload.grossOmzet)}`,
    `Void/refund: ${payload.voidRefundCount} (${formatIdr(payload.voidRefundTotal)})`,
    `Omzet neto: ${formatIdr(payload.netOmzet)}`,
    '',
    'Komposisi pembayaran:',
    ...payload.paymentMix.map(
      (row) =>
        `- ${PAYMENT_METHOD_LABELS[row.method] ?? row.method}: ${formatIdr(row.amount)} · ${row.count} trx · ${row.sharePercent}%`,
    ),
    payload.paymentMix.length === 0 ? '- (belum ada transaksi)' : '',
    '',
    `Diekspor: ${new Date().toISOString()}`,
  ].filter((line, index, arr) => !(line === '' && arr[index + 1] === ''));

  let y = 760;
  const textOps = lines
    .map((line) => {
      const op = `BT /F1 11 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`;
      y -= line === '' ? 10 : 16;
      return op;
    })
    .join('\n');

  const stream = `${textOps}\n`;
  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push(
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
  );
  objects.push(`4 0 obj << /Length ${Buffer.byteLength(stream, 'utf8')} >> stream\n${stream}endstream endobj`);
  objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}
