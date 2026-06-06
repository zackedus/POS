'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertBanner,
  cardStyle,
  LoadingSkeleton,
  PageHeader,
} from '@/components/dashboard/dashboard-ui';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchCustomers, type CustomerListItem } from '@/lib/customers-api';
import { mapApiError } from '@/lib/api-client';

export default function CustomersPage() {
  const { tokens } = useAdminTheme();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const timer = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Pelanggan & Poin Loyalitas"
        description="Daftar pelanggan terdaftar dari POS dan storefront. Poin didapat otomatis saat checkout selesai (earn-only MVP)."
      />

      {error ? <AlertBanner variant="error" onRetry={() => void load()}>{error}</AlertBanner> : null}

      <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}`, marginBottom: '1rem' })}>
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

      {loading ? (
        <LoadingSkeleton rows={5} />
      ) : (
        <section style={cardStyle({ background: tokens.cardBg, border: `1px solid ${tokens.cardBorder}` })}>
          {customers.length === 0 ? (
            <p style={{ margin: 0, color: tokens.muted }}>Belum ada pelanggan terdaftar.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tokens.cardBorder}`, textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem' }}>Nama</th>
                    <th style={{ padding: '0.5rem' }}>No. HP</th>
                    <th style={{ padding: '0.5rem' }}>Poin</th>
                    <th style={{ padding: '0.5rem' }}>Terakhir diperbarui</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} style={{ borderBottom: `1px solid ${tokens.cardBorder}` }}>
                      <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600 }}>{customer.name}</td>
                      <td style={{ padding: '0.65rem 0.5rem' }}>{customer.phone}</td>
                      <td style={{ padding: '0.65rem 0.5rem', color: '#16a34a', fontWeight: 700 }}>
                        {customer.points.toLocaleString('id-ID')}
                      </td>
                      <td style={{ padding: '0.65rem 0.5rem', color: tokens.muted, fontSize: '0.8125rem' }}>
                        {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(
                          new Date(customer.updatedAt),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: tokens.muted }}>
        Redeem poin belum tersedia (MVP earn-only). WhatsApp blast — defer Fase 3.
      </p>
    </div>
  );
}
