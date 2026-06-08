'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { fetchCustomers, type CustomerListItem } from '@/lib/customers-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import { ReceivablePaymentHistoryTable } from '@/components/dashboard/ReceivablePaymentHistoryTable';
import { ReceivablePaymentModal } from '@/components/dashboard/ReceivablePaymentModal';
import {
  createReceivable,
  fetchCustomerPaymentHistory,
  fetchReceivables,
  RECEIVABLE_STATUS_LABELS,
  type ReceivableRow,
} from '@/lib/receivables-api';
import type { ReceivablePaymentView } from '@barokah/shared';

export default function ReceivablesPage() {
  const searchParams = useSearchParams();
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<ReceivablePaymentView[]>([]);
  const [historyCustomerName, setHistoryCustomerName] = useState('');
  const [createForm, setCreateForm] = useState({
    customerId: '',
    amount: '',
    dueDate: '',
    notes: '',
  });
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [creating, setCreating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, customerList] = await Promise.all([
        fetchReceivables({
          outletId: selectedOutletId ?? undefined,
          status: statusFilter || undefined,
        }),
        fetchCustomers(),
      ]);
      setRows(data);
      setCustomers(customerList);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat piutang.'));
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId, statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadPaymentHistory = useCallback(async (custId: string) => {
    if (!custId) {
      setPaymentHistory([]);
      setHistoryCustomerName('');
      return;
    }
    setLoadingHistory(true);
    try {
      const history = await fetchCustomerPaymentHistory(custId);
      setPaymentHistory(history.payments);
      setHistoryCustomerName(history.customer.name);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat riwayat pembayaran.'));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    void loadPaymentHistory(customerFilter);
  }, [customerFilter, loadPaymentHistory]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.customerId) {
      setError('Pilih pelanggan terlebih dahulu.');
      return;
    }
    const amount = parseCurrencyInput(createForm.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Nominal piutang harus angka bulat minimal Rp 1.');
      return;
    }
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      await createReceivable({
        customerId: createForm.customerId,
        amount,
        outletId: selectedOutletId ?? undefined,
        dueDate: createForm.dueDate.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
      });
      setSuccess('Piutang manual berhasil dicatat.');
      setCreateForm({ customerId: '', amount: '', dueDate: '', notes: '' });
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal membuat piutang.'));
    } finally {
      setCreating(false);
    }
  }

  const openRows = rows.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL');
  const totalOutstanding = openRows.reduce((sum, r) => sum + r.outstanding, 0);
  const overdueCount = rows.filter((r) => r.isOverdue).length;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Piutang Pelanggan"
        description="Tagihan tempo / kredit — catat pelunasan di kasir atau dashboard."
        actions={
          <>
            <Link href="/dashboard/finance">
              <Button type="button" variant="secondary">
                Hub Keuangan
              </Button>
            </Link>
            <Link href="/dashboard/receivables/aging">
              <Button type="button" variant="secondary">
                Aging Piutang
              </Button>
            </Link>
          </>
        }
      />
      {overdueCount > 0 ? (
        <AlertBanner variant="error">
          <strong>{overdueCount} tagihan terlambat</strong> — segera tindak lanjuti pelunasan.{' '}
          <button
            type="button"
            onClick={() => setStatusFilter('OVERDUE')}
            style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Filter jatuh tempo
          </button>
        </AlertBanner>
      ) : null}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}
      {needsOutletPick && (
        <AlertBanner variant="warning">Pilih cabang di header untuk filter piutang per outlet.</AlertBanner>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <SectionCard title="Outstanding">
          <strong style={{ fontSize: '1.35rem' }}>{formatCurrencyIDR(totalOutstanding)}</strong>
          <p style={{ margin: '0.35rem 0 0', opacity: 0.7 }}>{openRows.length} tagihan aktif</p>
        </SectionCard>
      </div>

      <SectionCard title="Filter">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #cbd5e1', minWidth: 200 }}
          >
            <option value="">Semua pelanggan (riwayat)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard title="Tambah Piutang Manual">
        <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
          <label>
            Pelanggan <span style={{ color: '#b91c1c' }}>*</span>
            <select
              required
              value={createForm.customerId}
              onChange={(e) => setCreateForm((p) => ({ ...p, customerId: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            >
              <option value="">— Pilih pelanggan —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>
          </label>
          <CurrencyInput
            label="Nominal piutang"
            value={createForm.amount}
            onChange={(v) => setCreateForm((p) => ({ ...p, amount: v }))}
          />
          <label>
            Jatuh tempo (opsional)
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            />
          </label>
          <label>
            Catatan (opsional)
            <input
              type="text"
              value={createForm.notes}
              onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            />
          </label>
          <Button type="submit" disabled={creating || customers.length === 0}>
            {creating ? 'Menyimpan…' : 'Catat Piutang'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Catat Pembayaran">
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: '#64748b' }}>
          Catat pelunasan piutang via tunai, transfer, deposit, atau QRIS — dengan bukti pembayaran.
        </p>
        <Button
          type="button"
          disabled={openRows.length === 0}
          onClick={() => setShowPayModal(true)}
        >
          Catat Pembayaran
        </Button>
      </SectionCard>

      {customerFilter ? (
        <SectionCard title={`Riwayat Pembayaran — ${historyCustomerName || '…'}`}>
          <ReceivablePaymentHistoryTable
            payments={paymentHistory}
            customerName={historyCustomerName}
            loading={loadingHistory}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Riwayat Pembayaran">
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Pilih pelanggan di filter untuk melihat riwayat pembayaran piutang lengkap.
          </p>
        </SectionCard>
      )}

      <ReceivablePaymentModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        onSuccess={(msg) => {
          setSuccess(msg);
          void loadData();
          if (customerFilter) void loadPaymentHistory(customerFilter);
        }}
        customerId={customerFilter || undefined}
        customerName={
          customerFilter
            ? customers.find((c) => c.id === customerFilter)?.name
            : undefined
        }
        receivables={customerFilter ? openRows.filter((r) => r.customerId === customerFilter) : openRows}
      />

      <SectionCard title="Daftar Piutang">
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada piutang" description="Piutang otomatis tercatat saat checkout tempo di kasir." />
        ) : (
          <DataTable>
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.th}>Pelanggan</th>
                  <th style={tableStyles.th}>Total</th>
                  <th style={tableStyles.th}>Sisa</th>
                  <th style={tableStyles.th}>Jatuh Tempo</th>
                  <th style={tableStyles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableStyles.td}>
                      <div>{row.customer?.name ?? '—'}</div>
                      <small>{row.customer?.phone}</small>
                      {row.customer?.id ? (
                        <div style={{ marginTop: 4, display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <Link
                            href={`/dashboard/customers/${row.customer.id}?tab=piutang`}
                            style={{ fontSize: '0.75rem', color: '#2563eb' }}
                          >
                            Profil pelanggan
                          </Link>
                          <Link
                            href={`/dashboard/receivables/statement/${row.customer.id}`}
                            style={{ fontSize: '0.75rem', color: '#2563eb' }}
                          >
                            Cetak Statement
                          </Link>
                        </div>
                      ) : null}
                      {row.transaction?.receiptNo && row.transactionId ? (
                        <div style={{ marginTop: 4 }}>
                          <Link
                            href={`/dashboard/transactions?receiptNo=${encodeURIComponent(row.transaction.receiptNo)}`}
                            style={{ fontSize: '0.75rem', color: '#2563eb' }}
                          >
                            Transaksi: {row.transaction.receiptNo}
                          </Link>
                        </div>
                      ) : null}
                    </td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(row.amount)}</td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(row.outstanding)}</td>
                    <td style={tableStyles.td}>
                      {row.dueDate ?? '—'}
                      {row.isOverdue ? (
                        <span
                          style={{
                            display: 'inline-block',
                            marginLeft: 6,
                            padding: '0.1rem 0.4rem',
                            borderRadius: 999,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: '#fef2f2',
                            color: '#b91c1c',
                          }}
                        >
                          Terlambat
                        </span>
                      ) : null}
                    </td>
                    <td style={tableStyles.td}>
                      <StatusBadge
                        label={RECEIVABLE_STATUS_LABELS[row.status]}
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
