'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, parseCurrencyInput, type PaymentReceiptView } from '@barokah/shared';
import { Button, CurrencyInput, Input } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { PaymentSuccessModal } from '@/components/finance/PaymentSuccessModal';
import { mapApiError } from '@/lib/api-client';
import { fetchCustomers, type CustomerListItem } from '@/lib/customers-api';
import {
  DEPOSIT_TYPE_LABELS,
  fetchDeposits,
  topUpDeposit,
  type DepositSummaryRow,
} from '@/lib/deposits-api';

export function DepositsPanel({ embedded = false }: { embedded?: boolean }) {
  const [rows, setRows] = useState<DepositSummaryRow[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<PaymentReceiptView | null>(null);
  const [form, setForm] = useState({ customerId: '', amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deposits, customerList] = await Promise.all([fetchDeposits(), fetchCustomers()]);
      setRows(deposits);
      setCustomers(customerList);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat deposit.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleTopUp(e: FormEvent) {
    e.preventDefault();
    if (!form.customerId) {
      setError('Pilih pelanggan.');
      return;
    }
    const amount = parseCurrencyInput(form.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Nominal top-up harus angka bulat minimal Rp 1.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await topUpDeposit({
        customerId: form.customerId,
        amount,
        notes: form.notes.trim() || undefined,
      });
      setSuccess('Top-up deposit berhasil.');
      setSuccessReceipt(result.receipt);
      setForm({ customerId: '', amount: '', notes: '' });
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal top-up deposit.'));
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = rows.reduce((sum, r) => sum + r.balance, 0);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <PaymentSuccessModal
        open={Boolean(successReceipt)}
        message={success ?? 'Top-up deposit berhasil.'}
        receipt={successReceipt}
        onClose={() => {
          setSuccessReceipt(null);
          setSuccess(null);
        }}
      />
      {!embedded ? (
        <PageHeader title="Deposit Pelanggan" description="Uang muka pelanggan — top-up, pakai di kasir, atau refund." />
      ) : null}
      {error && <AlertBanner variant="error">{error}</AlertBanner>}
      {success && <AlertBanner variant="success">{success}</AlertBanner>}

      <SectionCard title="Total Saldo Deposit Aktif">
        <strong style={{ fontSize: '1.35rem' }}>{formatCurrencyIDR(totalBalance)}</strong>
      </SectionCard>

      <SectionCard title="Top-up Deposit">
        <form onSubmit={(e) => void handleTopUp(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 480 }}>
          <label>
            Pelanggan <span style={{ color: '#b91c1c' }}>*</span>
            <select
              required
              value={form.customerId}
              onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
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
          <CurrencyInput label="Nominal top-up" value={form.amount} onChange={(v) => setForm((p) => ({ ...p, amount: v }))} />
          <Input label="Catatan (opsional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : 'Top-up Deposit'}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Akun Deposit">
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState title="Belum ada deposit" description="Top-up deposit pelanggan untuk pesanan khusus atau retur." />
        ) : (
          <DataTable>
            <table style={tableStyles.table}>
              <thead>
                <tr>
                  <th style={tableStyles.th}>Pelanggan</th>
                  <th style={tableStyles.th}>Saldo</th>
                  <th style={tableStyles.th}>Status</th>
                  <th style={tableStyles.th}>Terakhir aktivitas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td style={tableStyles.td}>
                      <div>{row.customer.name}</div>
                      <small>{row.customer.phone}</small>
                    </td>
                    <td style={tableStyles.td}>{formatCurrencyIDR(row.balance)}</td>
                    <td style={tableStyles.td}>{row.status}</td>
                    <td style={tableStyles.td}>{new Date(row.lastActivityAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </SectionCard>
      <p style={{ fontSize: '0.85rem', opacity: 0.65 }}>
        Jenis transaksi ledger: {Object.values(DEPOSIT_TYPE_LABELS).join(' · ')}
      </p>
    </div>
  );
}
