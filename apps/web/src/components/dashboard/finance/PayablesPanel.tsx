'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatusBadge,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  fetchPayables,
  PAYABLE_STATUS_LABELS,
  recordPayablePayment,
  type PayableRow,
} from '@/lib/payables-api';

export function PayablesPanel({
  embedded = false,
  initialStatus,
}: {
  embedded?: boolean;
  initialStatus?: string;
}) {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [rows, setRows] = useState<PayableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus ?? '');
  const [payForm, setPayForm] = useState<{ payableId: string; amount: string; method: string }>({
    payableId: '',
    amount: '',
    method: 'TRANSFER',
  });
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPayables({
        status: statusFilter || undefined,
        outletId: selectedOutletId ?? undefined,
      });
      setRows(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat utang.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, needsOutletPick, selectedOutletId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payForm.payableId) {
      setError('Pilih utang terlebih dahulu.');
      return;
    }
    const amount = parseCurrencyInput(payForm.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Nominal pembayaran harus angka bulat minimal Rp 1.');
      return;
    }
    setPaying(true);
    setError(null);
    setSuccess(null);
    try {
      await recordPayablePayment(payForm.payableId, { amount, method: payForm.method });
      setSuccess('Pembayaran utang supplier berhasil dicatat.');
      setPayForm({ payableId: '', amount: '', method: 'TRANSFER' });
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mencatat pembayaran.'));
    } finally {
      setPaying(false);
    }
  }

  const openRows = rows.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL');
  const totalOutstanding = openRows.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {!embedded ? (
        <PageHeader
          title="Utang Supplier"
          description="Hutang ke distributor — otomatis dari PO atau manual, catat pembayaran."
          actions={
            <Link href="/dashboard/finance?tab=ringkasan">
              <Button type="button" variant="secondary">
                Hub Keuangan
              </Button>
            </Link>
          }
        />
      ) : null}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}
      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header untuk filter utang per outlet (via PO).</AlertBanner>
      ) : null}

      <SectionCard title="Outstanding">
        <strong style={{ fontSize: '1.35rem' }}>{formatCurrencyIDR(totalOutstanding)}</strong>
      </SectionCard>

      <SectionCard title="Filter">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1' }}
        >
          <option value="">Semua status</option>
          <option value="OPEN">Belum bayar</option>
          <option value="PARTIAL">Sebagian</option>
          <option value="OVERDUE">Jatuh tempo</option>
          <option value="PAID">Lunas</option>
        </select>
      </SectionCard>

      <SectionCard title="Catat Pembayaran ke Supplier">
        <form onSubmit={(e) => void handlePay(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
          <label>
            Utang
            <select
              value={payForm.payableId}
              onChange={(e) => setPayForm((p) => ({ ...p, payableId: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            >
              <option value="">— Pilih —</option>
              {openRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.supplier?.name ?? r.supplierId} — sisa {formatCurrencyIDR(r.outstanding)}
                </option>
              ))}
            </select>
          </label>
          <CurrencyInput label="Nominal" value={payForm.amount} onChange={(v) => setPayForm((p) => ({ ...p, amount: v }))} />
          <label>
            Metode
            <select
              value={payForm.method}
              onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            >
              <option value="TRANSFER">Transfer</option>
              <option value="CASH">Tunai</option>
              <option value="QRIS">QRIS</option>
            </select>
          </label>
          <Button type="submit" disabled={paying || openRows.length === 0}>
            {paying ? 'Menyimpan…' : 'Catat Pembayaran'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Daftar Utang">
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada utang" description="Buat utang dari halaman detail PO setelah penerimaan barang." />
        ) : (
          <DataTable>
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.th}>Supplier</th>
                  <th style={tableStyles.th}>PO</th>
                  <th style={tableStyles.th}>Total</th>
                  <th style={tableStyles.th}>Sisa</th>
                  <th style={tableStyles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableStyles.td}>
                      <div>{row.supplier?.name ?? '—'}</div>
                      {row.supplierId ? (
                        <Link
                          href={`/dashboard/purchase-orders?supplierId=${row.supplierId}`}
                          style={{ fontSize: '0.75rem', color: '#2563eb' }}
                        >
                          Lihat PO supplier →
                        </Link>
                      ) : null}
                    </td>
                    <td style={tableStyles.td}>
                      {row.purchaseOrder?.orderNo ? (
                        <Link
                          href={`/dashboard/purchase-orders/${row.purchaseOrder.id}`}
                          style={{ color: '#2563eb' }}
                        >
                          {row.purchaseOrder.orderNo}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(row.amount)}</td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(row.outstanding)}</td>
                    <td style={tableStyles.td}>
                      <StatusBadge
                        label={PAYABLE_STATUS_LABELS[row.status]}
                        variant={row.status === 'PAID' ? 'success' : row.isOverdue ? 'error' : 'neutral'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </SectionCard>
    </div>
  );
}
