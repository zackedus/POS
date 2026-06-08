'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  DataTable,
  LoadingSkeleton,
  PageHeader,
  SectionCard,
  tableStyles,
} from '@/components/dashboard/dashboard-ui';
import { mapApiError } from '@/lib/api-client';
import { fetchCustomerStatement } from '@/lib/receivables-api';
import type { CustomerStatement } from '@barokah/shared';

function defaultFromDate(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatStatementDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function CustomerStatementPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFrom(defaultFromDate());
    setTo(todayIso());
  }, []);

  const load = useCallback(async () => {
    if (!customerId || !from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerStatement(customerId, { from, to });
      setStatement(data);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat statement.'));
      setStatement(null);
    } finally {
      setLoading(false);
    }
  }, [customerId, from, to]);

  useEffect(() => {
    if (from && to) void load();
  }, [load, from, to]);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: '1.25rem' }} className="statement-page">
        <div className="no-print">
          <PageHeader
            title="Statement Piutang Pelanggan"
            description="Ringkasan piutang, pembayaran, dan saldo deposit."
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Piutang', href: '/dashboard/receivables' },
              { label: 'Statement' },
            ]}
            actions={
              <>
                <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
                  {loading ? 'Memuat…' : 'Muat ulang'}
                </Button>
                <Button type="button" variant="primary" onClick={handlePrint} disabled={!statement}>
                  Cetak Statement
                </Button>
              </>
            }
          />
        </div>

        <SectionCard title="Periode">
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Dari
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '0.5rem' }} />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: '0.875rem' }}>
              Sampai
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '0.5rem' }} />
            </label>
          </div>
        </SectionCard>

        {error ? (
          <div className="no-print">
            <AlertBanner variant="error">{error}</AlertBanner>
          </div>
        ) : null}
        {loading && !statement ? <LoadingSkeleton rows={6} /> : null}

        {statement ? (
          <SectionCard title={`Statement — ${statement.customer.name}`}>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#475569' }}>
              <p style={{ margin: '0 0 0.25rem' }}>
                <strong>{statement.customer.name}</strong> · {statement.customer.phone}
              </p>
              <p style={{ margin: 0 }}>
                Periode: {statement.period.from} — {statement.period.to}
                {statement.customer.creditLimit != null
                  ? ` · Limit kredit: ${formatCurrencyIDR(statement.customer.creditLimit)}`
                  : ''}
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Awal</div>
                <strong>{formatCurrencyIDR(statement.openingBalance)}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Akhir Piutang</div>
                <strong>{formatCurrencyIDR(statement.closingBalance)}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: '#f0fdf4', borderRadius: 8 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Saldo Deposit</div>
                <strong>{formatCurrencyIDR(statement.depositBalance)}</strong>
              </div>
            </div>

            {statement.entries.length === 0 ? (
              <p style={{ color: '#64748b' }}>Tidak ada transaksi pada periode ini.</p>
            ) : (
              <DataTable>
                <table style={tableStyles.table}>
                  <thead>
                    <tr>
                      <th style={tableStyles.th}>Tanggal</th>
                      <th style={tableStyles.th}>Keterangan</th>
                      <th style={tableStyles.th}>Debit</th>
                      <th style={tableStyles.th}>Kredit</th>
                      <th style={tableStyles.th}>Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={tableStyles.td}>{statement.period.from}</td>
                      <td style={tableStyles.td} colSpan={3}>
                        <em>Saldo awal</em>
                      </td>
                      <td style={tableStyles.td}>{formatCurrencyIDR(statement.openingBalance)}</td>
                    </tr>
                    {statement.entries.map((entry) => (
                      <tr key={entry.id}>
                        <td style={tableStyles.td}>{formatStatementDate(entry.date)}</td>
                        <td style={tableStyles.td}>
                          {entry.description}
                          {entry.reference ? ` (${entry.reference})` : ''}
                        </td>
                        <td style={tableStyles.td}>{entry.debit > 0 ? formatCurrencyIDR(entry.debit) : '—'}</td>
                        <td style={tableStyles.td}>{entry.credit > 0 ? formatCurrencyIDR(entry.credit) : '—'}</td>
                        <td style={tableStyles.td}>{formatCurrencyIDR(entry.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </DataTable>
            )}

            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              Dicetak: {formatStatementDate(statement.generatedAt)}
            </p>
          </SectionCard>
        ) : null}

        <p className="no-print" style={{ margin: 0, fontSize: '0.8125rem' }}>
          <Link href="/dashboard/receivables" style={{ color: '#2563eb' }}>
            ← Kembali ke piutang
          </Link>
        </p>
      </div>
    </>
  );
}
