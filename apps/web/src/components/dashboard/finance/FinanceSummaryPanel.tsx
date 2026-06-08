'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR, getTodayDate } from '@barokah/shared';
import { Button } from '@barokah/ui';
import {
  AlertBanner,
  LoadingSkeleton,
  SectionCard,
  StatCard,
  dashboardTokens,
} from '@/components/dashboard/dashboard-ui';
import { financeTabHref, type FinanceTabId } from '@/components/dashboard/finance/finance-ui';
import { fetchFinanceSummary, sendOverdueReminders, type FinanceSummary } from '@/lib/finance-api';
import { useOutletSelection } from '@/lib/outlet-selection-state';

const gridStyle = dashboardTokens.grid;

const QUICK_LINKS: Array<{ tab?: FinanceTabId; href?: string; label: string; desc: string }> = [
  { tab: 'piutang', label: 'Piutang', desc: 'Tagihan pelanggan tempo' },
  { tab: 'utang', label: 'Utang', desc: 'Hutang ke supplier' },
  { tab: 'aging', label: 'Aging Piutang', desc: 'Analisis jatuh tempo AR' },
  { tab: 'deposit', label: 'Deposit', desc: 'Saldo uang muka pelanggan' },
  { tab: 'pengeluaran', label: 'Pengeluaran', desc: 'Biaya operasional toko' },
  { href: '/dashboard/reports/finance', label: 'Laporan Keuangan', desc: 'Laba rugi, AR/AP, arus kas' },
];

export function FinanceSummaryPanel({ onNavigate }: { onNavigate?: (tab: FinanceTabId) => void }) {
  const { selectedOutletId, needsOutletPick } = useOutletSelection();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const loadSummary = useCallback(async () => {
    if (needsOutletPick) {
      setLoading(false);
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFinanceSummary({
        outletId: selectedOutletId ?? undefined,
        date: getTodayDate(),
      });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan keuangan.');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [needsOutletPick, selectedOutletId]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="button" variant="secondary" onClick={() => void loadSummary()} disabled={loading}>
          {loading ? 'Memuat…' : 'Muat ulang ringkasan'}
        </Button>
      </div>

      {needsOutletPick ? (
        <AlertBanner variant="warning">Pilih cabang di header untuk filter laporan per outlet.</AlertBanner>
      ) : null}

      {error ? (
        <AlertBanner variant="error" onRetry={() => void loadSummary()}>
          {error}
        </AlertBanner>
      ) : null}

      {reminderMessage ? <AlertBanner variant="success">{reminderMessage}</AlertBanner> : null}

      {summary && summary.receivablesOverdue > 0 ? (
        <AlertBanner variant="error">
          <strong>{summary.receivablesOverdue} piutang jatuh tempo</strong> — total{' '}
          {formatCurrencyIDR(summary.receivablesOverdueAmount)}.{' '}
          <Link href={financeTabHref('piutang', { status: 'OVERDUE' })} style={{ color: 'inherit', fontWeight: 600 }}>
            Lihat daftar →
          </Link>
        </AlertBanner>
      ) : null}

      {summary && summary.payablesOverdue > 0 ? (
        <AlertBanner variant="warning">
          <strong>{summary.payablesOverdue} utang supplier jatuh tempo</strong> — total{' '}
          {formatCurrencyIDR(summary.payablesOverdueAmount)}.{' '}
          <Link href={financeTabHref('utang', { status: 'OVERDUE' })} style={{ color: 'inherit', fontWeight: 600 }}>
            Lihat utang →
          </Link>
        </AlertBanner>
      ) : null}

      {loading && !summary ? <LoadingSkeleton rows={4} /> : null}

      {summary ? (
        <>
          <div style={gridStyle}>
            <StatCard
              label="Total Piutang"
              value={formatCurrencyIDR(summary.receivablesOutstanding)}
              accent={summary.receivablesOutstanding > 0 ? 'warning' : 'success'}
              hint={
                summary.receivablesOverdue > 0
                  ? `${summary.receivablesOverdue} jatuh tempo`
                  : 'Tidak ada overdue'
              }
            />
            <StatCard
              label="Total Utang"
              value={formatCurrencyIDR(summary.payablesOutstanding)}
              accent={summary.payablesOutstanding > 0 ? 'warning' : 'default'}
              hint={
                summary.payablesOverdue > 0
                  ? `${summary.payablesOverdue} jatuh tempo`
                  : 'Tidak ada overdue'
              }
            />
            <StatCard
              label="Posisi Net"
              value={formatCurrencyIDR(summary.netPosition)}
              accent={summary.netPosition >= 0 ? 'success' : 'error'}
              hint="Piutang − utang"
            />
            <StatCard
              label="Kewajiban Deposit"
              value={formatCurrencyIDR(summary.depositsOutstanding)}
              hint="Saldo hold pelanggan"
            />
            <StatCard
              label="Kas Hari Ini"
              value={formatCurrencyIDR(summary.cashToday)}
              accent="success"
              hint="Pembayaran tunai transaksi selesai"
            />
          </div>

          <SectionCard title="Akses Cepat" description="Navigasi modul keuangan terkait.">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {QUICK_LINKS.map((link) =>
                link.href ? (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: 'block',
                      padding: '0.875rem 1rem',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      textDecoration: 'none',
                      background: '#f8fafc',
                      color: '#0f172a',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem' }}>{link.label}</span>
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
                      {link.desc}
                    </span>
                  </Link>
                ) : link.tab && onNavigate ? (
                  <button
                    key={link.tab}
                    type="button"
                    onClick={() => onNavigate(link.tab!)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.875rem 1rem',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      color: '#0f172a',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem' }}>{link.label}</span>
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
                      {link.desc}
                    </span>
                  </button>
                ) : link.tab ? (
                  <Link
                    key={link.tab}
                    href={financeTabHref(link.tab)}
                    style={{
                      display: 'block',
                      padding: '0.875rem 1rem',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                      textDecoration: 'none',
                      background: '#f8fafc',
                      color: '#0f172a',
                    }}
                  >
                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.9375rem' }}>{link.label}</span>
                    <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
                      {link.desc}
                    </span>
                  </Link>
                ) : null,
              )}
            </div>
          </SectionCard>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {summary.receivablesOverdue > 0 ? (
              <Button
                type="button"
                variant="secondary"
                disabled={sendingReminder}
                onClick={() => {
                  setSendingReminder(true);
                  setReminderMessage(null);
                  void sendOverdueReminders(selectedOutletId ?? undefined)
                    .then((r) => setReminderMessage(r.message))
                    .catch((err) =>
                      setReminderMessage(err instanceof Error ? err.message : 'Gagal mengirim pengingat.'),
                    )
                    .finally(() => setSendingReminder(false));
                }}
              >
                {sendingReminder ? 'Memproses…' : 'Kirim Pengingat Piutang (Stub)'}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
