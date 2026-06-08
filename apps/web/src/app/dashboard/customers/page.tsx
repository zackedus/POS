'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchMe, type AuthUser } from '@/lib/auth';
import {
  createCustomer,
  fetchCustomerDetail,
  fetchCustomers,
  type CustomerDetail,
  type CustomerListItem,
} from '@/lib/customers-api';
import { canManageCustomers } from '@/lib/rbac';
import { mapApiError } from '@/lib/api-client';

export default function CustomersPage() {
  const { tokens } = useAdminTheme();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [creating, setCreating] = useState(false);

  const canEdit = currentUser ? canManageCustomers(currentUser.role) : false;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCustomers(await fetchCustomers(search));
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat pelanggan.'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void fetchMe()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    void fetchCustomerDetail(selectedId)
      .then(setDetail)
      .catch((err) => setError(mapApiError(err, 'Gagal memuat detail pelanggan.')))
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

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
        description="Daftar member dari POS, storefront, dan pendaftaran walk-in staff. Poin loyalty otomatis saat checkout."
      />

      {error ? <AlertBanner variant="error" onRetry={() => void load()}>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
        <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem', maxWidth: 360 }}>
          Cari nama / no. HP
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ketik nama atau 08…"
            style={{ padding: '0.5rem', borderRadius: 8, border: `1px solid ${tokens.cardBorder}` }}
          />
        </label>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 340px)', gap: '1rem' }}>
        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          {loading ? (
            <LoadingSkeleton rows={5} />
          ) : customers.length === 0 ? (
            <p style={{ margin: 0, color: tokens.muted }}>Belum ada pelanggan terdaftar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Nama</th>
                    <th style={{ padding: '0.5rem' }}>No. HP</th>
                    <th style={{ padding: '0.5rem' }}>Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedId(customer.id)}
                      style={{
                        borderBottom: `1px solid ${tokens.cardBorder}`,
                        cursor: 'pointer',
                        background: selectedId === customer.id ? '#f0fdf4' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{customer.name}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{customer.phone}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#16a34a', fontWeight: 700 }}>
                        {customer.points.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Detail pelanggan</h3>
          {!selectedId ? (
            <p style={{ margin: 0, color: tokens.muted, fontSize: '0.875rem' }}>Pilih baris untuk melihat riwayat.</p>
          ) : detailLoading ? (
            <LoadingSkeleton rows={3} />
          ) : detail ? (
            <div style={{ fontSize: '0.875rem', display: 'grid', gap: '0.5rem' }}>
              <div>
                <strong>{detail.name}</strong>
                <div style={{ color: tokens.muted }}>{detail.phone}</div>
              </div>
              <div>
                Saldo poin: <strong style={{ color: '#16a34a' }}>{detail.points.toLocaleString('id-ID')}</strong>
              </div>
              <div style={{ color: tokens.muted }}>
                Transaksi POS: {detail.stats.transactionCount} · Order online: {detail.stats.onlineOrderCount}
              </div>
              <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 8, display: 'grid', gap: '0.35rem' }}>
                <div style={{ fontWeight: 600, color: '#1e40af' }}>Ringkasan Keuangan</div>
                <div>
                  Piutang:{' '}
                  <strong>{formatCurrencyIDR(detail.receivableOutstanding ?? 0)}</strong>
                </div>
                <div>
                  Deposit: <strong>{formatCurrencyIDR(detail.depositBalance ?? 0)}</strong>
                </div>
                <div>
                  Limit kredit:{' '}
                  <strong>
                    {detail.creditLimit === 0
                      ? 'Tidak diizinkan tempo'
                      : detail.creditLimit != null
                        ? formatCurrencyIDR(detail.creditLimit)
                        : 'Unlimited'}
                  </strong>
                </div>
                {detail.creditAvailable != null && detail.creditLimit !== 0 ? (
                  <div style={{ color: '#166534' }}>
                    Kredit tersedia: <strong>{formatCurrencyIDR(detail.creditAvailable)}</strong>
                  </div>
                ) : null}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  <Link href={`/dashboard/receivables?customerId=${detail.id}`}>
                    <Button type="button" variant="secondary" style={{ fontSize: '0.8125rem' }}>
                      Lihat Piutang
                    </Button>
                  </Link>
                  <Link href="/dashboard/deposits">
                    <Button type="button" variant="secondary" style={{ fontSize: '0.8125rem' }}>
                      Top-up Deposit
                    </Button>
                  </Link>
                </div>
              </div>
              <Link href={`/dashboard/receivables/statement/${detail.id}`}>
                <Button type="button" variant="secondary" style={{ marginTop: '0.25rem' }}>
                  Cetak Statement
                </Button>
              </Link>
              {detail.recentTransactions.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Transaksi terakhir</div>
                  <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                    {detail.recentTransactions.map((tx) => (
                      <li key={tx.id}>
                        {tx.receiptNo} — Rp {tx.total.toLocaleString('id-ID')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {detail.recentOnlineOrders.length > 0 ? (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Order online terakhir</div>
                  <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                    {detail.recentOnlineOrders.map((order) => (
                      <li key={order.id}>
                        {order.orderNo} — Rp {order.total.toLocaleString('id-ID')}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {canEdit ? (
        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.0625rem' }}>Daftar walk-in (staff)</h3>
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
