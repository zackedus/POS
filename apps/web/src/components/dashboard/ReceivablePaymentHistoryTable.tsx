'use client';

import { formatCurrencyIDR, RECEIVABLE_PAYMENT_METHOD_LABELS } from '@barokah/shared';
import type { ReceivablePaymentView } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { DataTable, EmptyState, tableStyles } from '@/components/dashboard/dashboard-ui';
import { exportPaymentHistoryCsv, printReceivablePaymentReceipt } from '@/lib/receivable-payment-print';

export interface ReceivablePaymentHistoryTableProps {
  payments: ReceivablePaymentView[];
  customerName?: string;
  customerPhone?: string;
  loading?: boolean;
  showExport?: boolean;
}

export function ReceivablePaymentHistoryTable({
  payments,
  customerName = 'Pelanggan',
  customerPhone,
  loading = false,
  showExport = true,
}: ReceivablePaymentHistoryTableProps) {
  if (loading) {
    return <p style={{ opacity: 0.7 }}>Memuat riwayat…</p>;
  }

  if (payments.length === 0) {
    return (
      <EmptyState
        title="Belum ada pembayaran piutang"
        description="Pembayaran tempo/transfer/deposit akan muncul di sini."
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {showExport ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={() => exportPaymentHistoryCsv(payments)}>
            Export CSV
          </Button>
        </div>
      ) : null}
      <DataTable>
        <table style={tableStyles.table}>
          <thead>
            <tr>
              <th style={tableStyles.th}>Tanggal</th>
              <th style={tableStyles.th}>No. Bukti</th>
              <th style={tableStyles.th}>Metode</th>
              <th style={tableStyles.th}>Nominal</th>
              <th style={tableStyles.th}>Ref TF</th>
              <th style={tableStyles.th}>Bukti</th>
              <th style={tableStyles.th}>Petugas</th>
              <th style={tableStyles.th}>Ref Piutang</th>
              <th style={tableStyles.th} />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td style={tableStyles.td}>{new Date(p.createdAt).toLocaleString('id-ID')}</td>
                <td style={tableStyles.td}>{p.receiptNumber ?? '—'}</td>
                <td style={tableStyles.td}>
                  {RECEIVABLE_PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                </td>
                <td style={tableStyles.td}>{formatCurrencyIDR(p.amount)}</td>
                <td style={tableStyles.td}>{p.transferReference ?? '—'}</td>
                <td style={tableStyles.td}>
                  {p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>
                      Lihat
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={tableStyles.td}>{p.recordedBy.fullName}</td>
                <td style={tableStyles.td}>
                  {p.receivable?.transactionReceiptNo ?? p.receivableId.slice(0, 8)}
                </td>
                <td style={tableStyles.td}>
                  <Button
                    type="button"
                    variant="secondary"
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.45rem' }}
                    onClick={() =>
                      printReceivablePaymentReceipt({
                        payment: p,
                        customerName,
                        customerPhone,
                      })
                    }
                  >
                    Cetak
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DataTable>
    </div>
  );
}
