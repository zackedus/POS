'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrencyIDR, generateExpenseRef, getTodayDate, nextExpenseSequence, parseCurrencyInput, DEFAULT_PAGE_SIZE, type PaginationMeta } from '@barokah/shared';
import { Button, CurrencyInput, Input } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  StatCard,
  TablePagination,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { AutoGenerateBadge, AutoGenerateHelper, autoFieldLabelStyle } from '@/components/master/AutoGenerateHints';
import { mapApiError } from '@/lib/api-client';
import { buildFilterChips, defaultDateFilters } from '@/lib/list-filters';
import { useOutletSelection } from '@/lib/outlet-selection-state';
import {
  createExpense,
  EXPENSE_CATEGORY_LABELS,
  fetchExpenses,
  fetchExpenseTodaySummary,
  type ExpenseCategory,
  type ExpenseRow,
} from '@/lib/expenses-api';

export function ExpensesPanel({ embedded = false }: { embedded?: boolean }) {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [todayTotal, setTodayTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const defaultDates = defaultDateFilters();
  const [draftCategory, setDraftCategory] = useState<'' | ExpenseCategory>('');
  const [draftDateFrom, setDraftDateFrom] = useState(defaultDates.dateFrom);
  const [draftDateTo, setDraftDateTo] = useState(defaultDates.dateTo);
  const [appliedCategory, setAppliedCategory] = useState<'' | ExpenseCategory>('');
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultDates.dateFrom);
  const [appliedDateTo, setAppliedDateTo] = useState(defaultDates.dateTo);
  const [form, setForm] = useState(() => {
    const today = getTodayDate();
    return {
      category: 'OPERATIONAL' as ExpenseCategory,
      amount: '',
      description: '',
      expenseDate: today,
      referenceNo: generateExpenseRef({ date: new Date(`${today}T00:00:00`) }),
    };
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        {
          key: 'category',
          label: `Kategori: ${appliedCategory ? EXPENSE_CATEGORY_LABELS[appliedCategory] : ''}`,
          active: Boolean(appliedCategory),
        },
        {
          key: 'date',
          label: `Tanggal: ${appliedDateFrom} – ${appliedDateTo}`,
          active: appliedDateFrom !== defaultDates.dateFrom || appliedDateTo !== defaultDates.dateTo,
        },
      ]),
    [appliedCategory, appliedDateFrom, appliedDateTo, defaultDates.dateFrom, defaultDates.dateTo],
  );

  function applyFilters() {
    setAppliedCategory(draftCategory);
    setAppliedDateFrom(draftDateFrom);
    setAppliedDateTo(draftDateTo);
    setPage(1);
  }

  function resetFilters() {
    const dates = defaultDateFilters();
    setDraftCategory('');
    setDraftDateFrom(dates.dateFrom);
    setDraftDateTo(dates.dateTo);
    setAppliedCategory('');
    setAppliedDateFrom(dates.dateFrom);
    setAppliedDateTo(dates.dateTo);
    setPage(1);
  }

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
          category: appliedCategory || undefined,
          dateFrom: appliedDateFrom || undefined,
          dateTo: appliedDateTo || undefined,
          page,
          limit: pageSize,
        }),
        fetchExpenseTodaySummary(selectedOutletId ?? undefined),
      ]);
      setRows(expenses.items);
      setMeta(expenses.meta);
      setTodayTotal(summary.total);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pengeluaran.'));
    } finally {
      setLoading(false);
    }
  }, [appliedCategory, appliedDateFrom, appliedDateTo, needsOutletPick, selectedOutletId, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [selectedOutletId]);

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
      {!embedded ? (
        <PageHeader
          title="Pengeluaran Operasional"
          description="Catat onkos operasional, bongkar muat, dan biaya kirim barang per outlet."
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Pengeluaran' }]}
          helpText="Pengeluaran tercatat per outlet dan muncul di laporan harian manajer."
        />
      ) : null}

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
        <ListFilterBar
          collapsible={false}
          selects={[
            {
              id: 'category',
              label: 'Kategori',
              value: draftCategory,
              options: [
                { value: '', label: 'Semua kategori' },
                ...(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((key) => ({
                  value: key,
                  label: EXPENSE_CATEGORY_LABELS[key],
                })),
              ],
              onChange: (value) => setDraftCategory(value as '' | ExpenseCategory),
            },
          ]}
          dateFrom={draftDateFrom}
          dateTo={draftDateTo}
          onDateFromChange={setDraftDateFrom}
          onDateToChange={setDraftDateTo}
          showDateRange
          onApply={applyFilters}
          onReset={resetFilters}
          activeChips={activeChips}
        />

        {loading ? <LoadingSkeleton rows={4} /> : null}
        {!loading && rows.length === 0 ? (
          <EmptyState
            title="Belum ada pengeluaran"
            description={
              activeChips.length > 0
                ? FILTER_EMPTY_DESCRIPTION
                : 'Catat onkos operasional pertama di formulir di atas.'
            }
            icon="◧"
          />
        ) : null}
        {!loading && rows.length > 0 ? (
          <>
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
          <TablePagination
            page={meta.page}
            totalPages={meta.totalPages ?? 1}
            totalItems={meta.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
          </>
        ) : null}
      </SectionCard>
    </div>
  );
}
