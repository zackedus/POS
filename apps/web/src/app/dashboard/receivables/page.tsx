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
import {
  createReceivable,
  fetchReceivables,
  recordReceivablePayment,
  RECEIVABLE_STATUS_LABELS,
  type ReceivableRow,
} from '@/lib/receivables-api';

export default function ReceivablesPage() {
  const searchParams = useSearchParams();
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') ?? '');
  const [payForm, setPayForm] = useState<{ receivableId: string; amount: string; method: string }>({
    receivableId: '',
    amount: '',
    method: 'CASH',
  });
  const [createForm, setCreateForm] = useState({
    customerId: '',
    amount: '',
    dueDate: '',
    notes: '',
  });
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [paying, setPaying] = useState(false);
  const [creating, setCreating] = useState(false);

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

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payForm.receivableId) {
      setError('Pilih piutang terlebih dahulu.');
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
      await recordReceivablePayment(payForm.receivableId, {
        amount,
        method: payForm.method,
      });
      setSuccess('Pembayaran piutang berhasil dicatat.');
      setPayForm({ receivableId: '', amount: '', method: 'CASH' });
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mencatat pembayaran.'));
    } finally {
      setPaying(false);
    }
  }

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
        <form onSubmit={(e) => void handlePay(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
          <label>
            Piutang
            <select
              value={payForm.receivableId}
              onChange={(e) => setPayForm((p) => ({ ...p, receivableId: e.target.value }))}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '0.5rem' }}
            >
              <option value="">— Pilih —</option>
              {openRows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.customer?.name ?? r.customerId} — sisa {formatCurrencyIDR(r.outstanding)}
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
              <option value="CASH">Tunai</option>
              <option value="TRANSFER">Transfer</option>
              <option value="QRIS">QRIS</option>
            </select>
          </label>
          <Button type="submit" disabled={paying || openRows.length === 0}>
            {paying ? 'Menyimpan…' : 'Catat Pembayaran'}
          </Button>
        </form>
      </SectionCard>

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
                        <div style={{ marginTop: 4 }}>
                          <Link
                            href={`/dashboard/receivables/statement/${row.customer.id}`}
                            style={{ fontSize: '0.75rem', color: '#2563eb' }}
                          >
                            Cetak Statement
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
