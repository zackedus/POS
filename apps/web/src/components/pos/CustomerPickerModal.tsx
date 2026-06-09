'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { fetchCustomers, type CustomerListItem } from '@/lib/customers-api';

interface CustomerPickerModalProps {
  onSelect: (customer: CustomerListItem) => void;
  onClose: () => void;
  purpose?: 'CREDIT' | 'DEPOSIT' | null;
}

export function CustomerPickerModal({ onSelect, onClose, purpose = null }: CustomerPickerModalProps) {
  const dialogLabel =
    purpose === 'CREDIT'
      ? 'Pilih pelanggan — bayar tempo'
      : purpose === 'DEPOSIT'
        ? 'Pilih pelanggan — bayar deposit'
        : 'Pilih pelanggan';

  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      setCustomers((await fetchCustomers(query, { page: 1, limit: 50 })).items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar pelanggan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, load]);

  return (
    <div
      role="dialog"
      aria-label={dialogLabel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.25rem',
          maxWidth: 520,
          width: '100%',
          display: 'grid',
          gap: '0.75rem',
          maxHeight: '80vh',
        }}
      >
        <h3 style={{ margin: 0 }}>
          {purpose === 'CREDIT'
            ? 'Pilih Pelanggan — Bayar Tempo'
            : purpose === 'DEPOSIT'
              ? 'Pilih Pelanggan — Bayar Deposit'
              : 'Pilih Pelanggan'}
        </h3>
        {purpose ? (
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            Tempo dan deposit wajib terhubung ke pelanggan terdaftar.
          </p>
        ) : null}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, HP, atau kode member…"
          autoFocus
          style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem' }}
        />

        {error ? (
          <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.875rem' }}>{error}</p>
        ) : null}

        <div style={{ overflowY: 'auto', display: 'grid', gap: '0.35rem', minHeight: 120 }}>
          {loading ? (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>Memuat…</p>
          ) : customers.length === 0 ? (
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
              Tidak ada pelanggan ditemukan.
            </p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  onSelect(customer);
                  onClose();
                }}
                style={{
                  textAlign: 'left',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '0.65rem 0.75rem',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <strong>{customer.name}</strong>
                <div style={{ fontSize: '0.8125rem', color: '#475569' }}>
                  {customer.phone}
                  {customer.memberCode ? ` · ${customer.memberCode}` : ''}
                </div>
                {customer.creditAvailable != null ? (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Kredit tersedia: {formatCurrencyIDR(customer.creditAvailable)}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>

        <Button type="button" variant="ghost" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </div>
  );
}
