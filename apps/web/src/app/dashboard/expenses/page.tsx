'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, generateExpenseRef, nextExpenseSequence, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput, Input } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatCard,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { AutoGenerateBadge, AutoGenerateHelper, autoFieldLabelStyle } from '@/components/master/AutoGenerateHints';
import { mapApiError } from '@/lib/api-client';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  createExpense,
  EXPENSE_CATEGORY_LABELS,
  fetchExpenses,
  fetchExpenseTodaySummary,
  type ExpenseCategory,
  type ExpenseRow,
} from '@/lib/expenses-api';

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [todayTotal, setTodayTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<'' | ExpenseCategory>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [form, setForm] = useState({
    category: 'OPERATIONAL' as ExpenseCategory,
    amount: '',
    description: '',
    expenseDate: '',
    referenceNo: '',
  });

  useEffect(() => {
    const today = todayIsoDate();
    setForm((prev) => ({
      ...prev,
      expenseDate: today,
      referenceNo: generateExpenseRef({ date: new Date(`${today}T00:00:00`) }),
    }));
    setFilterDateFrom(today);
    setFilterDateTo(today);
  }, []);

  useEffect(() => {
    const date = new Date(`${form.expenseDate}T00:00:00`);
    const existingRefs = rows
      .filter((row) => row.expenseDate === form.expenseDate)
      .map((row) => row.description ?? '')
      .flatMap((desc) => {
        const match = desc.match(/\[(EXP-\d{8}-\d{4})\]/);
        return match ? [match[1]] : [];
      });
    const sequence = nextExpenseSequence(existingRefs, date);
    const nextRef = generateExpenseRef({ date, sequence });
    setForm((prev) => (prev.referenceNo === nextRef ? prev : { ...prev, referenceNo: nextRef }));
  }, [form.expenseDate, rows]);

  const loadData = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [expenses, summary] = await Promise.all([
        fetchExpenses({
          outletId: selectedOutletId ?? undefined,
          category: filterCategory || undefined,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
        }),
        fetchExpenseTodaySummary(selectedOutletId ?? undefined),
      ]);
      setRows(expenses);
      setTodayTotal(summary.total);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pengeluaran.'));
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterDateFrom, filterDateTo, needsOutletPick, selectedOutletId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (needsOutletPick) {
      setError('Pilih outlet terlebih dahulu.');
      return;
    }
    const amount = parseCurrencyInput(form.amount);
    if (!Number.isInteger(amount) || amount < 1) {
      setError('Nominal pengeluaran harus angka bulat minimal Rp 1.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const refTag = `[${form.referenceNo}]`;
      const desc = form.description.trim();
      const description = desc.startsWith(refTag) ? desc : desc ? `${refTag} ${desc}` : refTag;

      await createExpense({
        outletId: selectedOutletId ?? undefined,
        category: form.category,
        amount,
        description,
        expenseDate: form.expenseDate,
      });
      setSuccess('Pengeluaran berhasil dicatat.');
      setForm((prev) => ({
        ...prev,
        amount: '',
        description: '',
        referenceNo: generateExpenseRef({ date: new Date(`${prev.expenseDate}T00:00:00`) }),
      }));
      await loadData();
    } catch (err) {
      setError(mapApiError(err, 'Gagal menyimpan pengeluaran.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengeluaran Operasional"
        description="Catat onkos operasional, bongkar muat, dan biaya kirim barang per outlet."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengeluaran' }]}
        helpText="Pengeluaran tercatat per outlet dan muncul di laporan harian manajer."
      />

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih outlet di header untuk mencatat pengeluaran.</AlertBanner>
      ) : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {todayTotal != null ? (
        <div style={{ marginBottom: '1rem', maxWidth: '320px' }}>
          <StatCard label="Pengeluaran hari ini" value={formatCurrencyIDR(todayTotal)} accent="warning" />
        </div>
      ) : null}

      <SectionCard title="Catat Pengeluaran" description="Isi formulir di bawah untuk mencatat biaya operasional baru.">
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: '0.75rem', maxWidth: '720px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Kategori</span>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                disabled={saving || needsOutletPick}
                style={{ padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {EXPENSE_CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <CurrencyInput
              label="Nominal (IDR)"
              value={form.amount}
              onChange={(amount) => setForm((prev) => ({ ...prev, amount }))}
              placeholder="50.000"
              disabled={saving || needsOutletPick}
              fullWidth
            />
            <Input
              label="Tanggal"
              type="date"
              value={form.expenseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, expenseDate: e.target.value }))}
              disabled={saving || needsOutletPick}
              fullWidth
            />
          </div>
          <div style={{ display: 'grid', gap: '0.375rem', maxWidth: '280px' }}>
            <div style={autoFieldLabelStyle()}>
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>No. referensi</span>
              <AutoGenerateBadge />
            </div>
            <Input value={form.referenceNo} readOnly disabled fullWidth aria-label="No. referensi" />
            <AutoGenerateHelper>Nomor referensi dibuat otomatis per tanggal</AutoGenerateHelper>
          </div>
          <Input
            label="Keterangan (opsional)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Contoh: ongkos angkut semen, listrik toko"
            disabled={saving || needsOutletPick}
            fullWidth
          />
          <div>
            <Button type="submit" disabled={saving || needsOutletPick}>
              {saving ? 'Menyimpan...' : 'Simpan pengeluaran'}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Riwayat Pengeluaran">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Dari tanggal</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Sampai tanggal</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Filter kategori</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as '' | ExpenseCategory)}
              style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
            >
              <option value="">Semua kategori</option>
              {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((key) => (
                <option key={key} value={key}>
                  {EXPENSE_CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? <LoadingSkeleton rows={4} /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            title="Belum ada pengeluaran"
            description="Catat onkos operasional pertama di formulir di atas."
            icon="◧"
          />
        ) : null}
        {!loading && rows.length > 0 ? (
          <DataTable>
            <thead>
              <tr>
                <th style={tableStyles.th}>Tanggal</th>
                <th style={tableStyles.th}>Kategori</th>
                <th style={tableStyles.th}>Keterangan</th>
                <th style={tableStyles.th}>Outlet</th>
                <th style={tableStyles.th}>Nominal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={tableStyles.row}>
                  <td style={tableStyles.td}>{row.expenseDate}</td>
                  <td style={tableStyles.td}>{EXPENSE_CATEGORY_LABELS[row.category]}</td>
                  <td style={tableStyles.td}>{row.description ?? '—'}</td>
                  <td style={tableStyles.td}>{row.outlet?.name ?? 'Tenant-wide'}</td>
                  <td style={{ ...tableStyles.td, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                    {formatCurrencyIDR(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : null}
      </SectionCard>
    </div>
  );
}
