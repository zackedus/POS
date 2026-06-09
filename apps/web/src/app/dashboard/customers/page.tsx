'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { formatCurrencyIDR, DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR, DEFAULT_PAGE_SIZE, type PaginationMeta } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  EmptyState,
  LoadingSkeleton,
  PageHeader,
  TablePagination,
} from '@/components/dashboard/dashboard-ui';
import { ListFilterBar, FILTER_EMPTY_DESCRIPTION } from '@/components/dashboard/ListFilterBar';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchMe, type AuthUser } from '@/lib/auth';
import {
  createCustomer,
  fetchCustomers,
  type CustomerListItem,
} from '@/lib/customers-api';
import { canManageCustomers } from '@/lib/rbac';
import { mapApiError } from '@/lib/api-client';
import { buildFilterChips } from '@/lib/list-filters';

export default function CustomersPage() {
  const { tokens } = useAdminTheme();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [draftSearch, setDraftSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [creating, setCreating] = useState(false);

  const canEdit = currentUser ? canManageCustomers(currentUser.role) : false;

  const activeChips = useMemo(
    () =>
      buildFilterChips([
        { key: 'search', label: `Cari: ${appliedSearch}`, active: Boolean(appliedSearch.trim()) },
      ]),
    [appliedSearch],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomers(appliedSearch || undefined, { page, limit: pageSize });
      setCustomers(result.items);
      setMeta(result.meta);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pelanggan.'));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page, pageSize]);

  function applyFilters() {
    setAppliedSearch(draftSearch);
    setPage(1);
  }

  function resetFilters() {
    setDraftSearch('');
    setAppliedSearch('');
    setPage(1);
  }

  useEffect(() => {
    void fetchMe()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      await createCustomer({ name: createName.trim(), phone: createPhone.trim() });
      setSuccess('Pelanggan berhasil didaftarkan.');
      setCreateName('');
      setCreatePhone('');
      await load();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mendaftarkan pelanggan.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ maxWidth: 1100, display: 'grid', gap: '1.25rem' }}>
      <PageHeader
        title="Member & Pelanggan"
        description="Kelola profil member, poin, piutang, deposit, dan kartu member."
      />

      {error ? <AlertBanner variant="error" onRetry={() => void load()}>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <ListFilterBar
        selects={[
          {
            id: 'status',
            label: 'Status',
            value: '',
            options: [{ value: '', label: 'Semua pelanggan' }],
            onChange: () => undefined,
          },
        ]}
        showDateRange={false}
        search={draftSearch}
        searchPlaceholder="Ketik nama, 08…, atau MBR-…"
        onSearchChange={setDraftSearch}
        onApply={applyFilters}
        onReset={resetFilters}
        activeChips={activeChips}
      />

      <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : customers.length === 0 ? (
          <EmptyState
            title="Belum ada pelanggan"
            description={activeChips.length > 0 ? FILTER_EMPTY_DESCRIPTION : 'Belum ada pelanggan terdaftar.'}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Nama</th>
                  <th style={{ padding: '0.5rem' }}>Member</th>
                  <th style={{ padding: '0.5rem' }}>Poin</th>
                  <th style={{ padding: '0.5rem' }}>Piutang</th>
                  <th style={{ padding: '0.5rem' }}>Deposit</th>
                  <th style={{ padding: '0.5rem' }} />
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{customer.name}</div>
                      <div style={{ color: tokens.muted, fontSize: '0.8125rem' }}>{customer.phone}</div>
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      {customer.memberCode ? (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.15rem 0.45rem',
                            borderRadius: 6,
                            fontFamily: 'monospace',
                          }}
                        >
                          {customer.memberCode}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem', color: '#16a34a', fontWeight: 700 }}>
                      {customer.points.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      {formatCurrencyIDR(customer.receivableOutstanding ?? 0)}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      {formatCurrencyIDR(customer.depositBalance ?? 0)}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button type="button" variant="secondary" style={{ fontSize: '0.8125rem' }}>
                          Detail
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          </div>
        )}
      </section>

      {canEdit ? (
        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.0625rem' }}>Daftar walk-in (staff)</h3>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: tokens.muted }}>
            Limit kredit default pelanggan baru: {formatCurrencyIDR(DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR)} (dapat
            diubah di detail pelanggan).
          </p>
          <form onSubmit={(e) => void handleCreate(e)} style={{ display: 'grid', gap: '0.75rem', maxWidth: 420 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Nama lengkap
              <input
                required
                minLength={2}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              No. HP
              <input
                required
                type="tel"
                value={createPhone}
                onChange={(e) => setCreatePhone(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
              />
            </label>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'Menyimpan…' : 'Daftarkan Pelanggan'}
            </Button>
          </form>
        </section>
      ) : null}
    </div>
  );
}
