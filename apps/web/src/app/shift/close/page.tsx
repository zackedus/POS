'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput } from '@barokah/ui';
import { AlertBanner, PageHeader, SectionCard, StatCard } from '@/components/dashboard/dashboard-ui';
import {
  closeShift,
  fetchActiveShift,
  fetchClosePreview,
  type ShiftClosePreview,
  type ShiftSummary,
} from '@/lib/shifts-api';
import { toUserFacingError } from '@/lib/api';

export default function CloseShiftPage() {
  const router = useRouter();
  const [activeShift, setActiveShift] = useState<ShiftSummary | null>(null);
  const [preview, setPreview] = useState<ShiftClosePreview | null>(null);
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    void fetchActiveShift()
      .then(async (shift) => {
        setActiveShift(shift);
        if (shift?.id) {
          const previewData = await fetchClosePreview(shift.id);
          setPreview(previewData);
        }
      })
      .catch((err: unknown) => {
        setError(toUserFacingError(err, 'Gagal memuat shift aktif.'));
      })
      .finally(() => setLoading(false));
  }, []);

  const parsedClosing = useMemo(() => {
    if (!closingCash.trim()) return null;
    try {
      return parseCurrencyInput(closingCash);
    } catch {
      return null;
    }
  }, [closingCash]);

  const projectedDifference =
    preview && parsedClosing != null ? parsedClosing - preview.expectedCash : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!activeShift?.id || !closingCash.trim()) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const closed = await closeShift(activeShift.id, parseCurrencyInput(closingCash));
      setResult(closed);
      setActiveShift(null);
      setPreview(null);
      setClosingCash('');
    } catch (err) {
      setError(toUserFacingError(err, 'Gagal menutup shift.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ color: '#64748b' }}>Memuat shift aktif…</p>
      </div>
    );
  }

  if (result) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <PageHeader title="Shift ditutup" description="Rekonsiliasi kas selesai. Ringkasan di bawah." />
        <SectionCard title="Ringkasan penutupan">
          <p style={{ margin: '0 0 0.5rem' }}>Saldo awal: {formatCurrencyIDR(result.openingCash)}</p>
          <p style={{ margin: '0.25rem 0' }}>Kas diharapkan: {formatCurrencyIDR(result.expectedCash ?? 0)}</p>
          <p style={{ margin: '0.25rem 0' }}>Saldo fisik: {formatCurrencyIDR(result.closingCash ?? 0)}</p>
          <p style={{ margin: '0.25rem 0' }}>Selisih: {formatCurrencyIDR(result.difference ?? 0)}</p>
        </SectionCard>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/shift/open" style={{ textDecoration: 'none' }}>
            <Button type="button" variant="secondary">
              Buka shift baru
            </Button>
          </Link>
          <Button type="button" onClick={() => router.push('/login')}>
            Selesai / Logout
          </Button>
        </div>
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <PageHeader title="Tutup Shift" description="Tidak ada shift aktif untuk ditutup." />
        <Link href="/shift/open" style={{ textDecoration: 'none' }}>
          <Button type="button">Buka shift</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PageHeader
        title="Tutup Shift Kasir"
        description="Hitung uang fisik di laci, bandingkan dengan kas yang diharapkan sistem, lalu submit penutupan shift."
      />

      <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#334155' }}>
        Shift aktif sejak {new Date(activeShift.openedAt).toLocaleString('id-ID')}
      </p>

      {preview ? (
        <>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: '1rem' }}>
            <StatCard label="Saldo awal" value={formatCurrencyIDR(preview.openingCash)} />
            <StatCard label="Penjualan tunai" value={formatCurrencyIDR(preview.cashSales)} hint={`${preview.transactionCount} transaksi`} />
            <StatCard label="Kas diharapkan" value={formatCurrencyIDR(preview.expectedCash)} accent="success" />
          </div>
          {preview.heldCount && preview.heldCount > 0 ? (
            <AlertBanner variant="warning">{preview.heldWarning ?? `${preview.heldCount} hold masih aktif.`}</AlertBanner>
          ) : null}
        </>
      ) : null}

      <SectionCard title="Rekonsiliasi kas fisik">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <CurrencyInput
            label="Saldo akhir kas fisik (IDR)"
            value={closingCash}
            onChange={setClosingCash}
            placeholder="450.000"
            fullWidth
            disabled={submitting}
          />
          {projectedDifference != null ? (
            <p style={{ margin: 0, fontSize: '0.875rem', color: projectedDifference === 0 ? '#166534' : '#b45309' }}>
              Selisih preview: {formatCurrencyIDR(projectedDifference)}
              {projectedDifference === 0 ? ' (pas)' : projectedDifference > 0 ? ' (lebih)' : ' (kurang)'}
            </p>
          ) : null}
          <Button type="submit" disabled={submitting || !closingCash.trim()}>
            {submitting ? 'Memproses…' : 'Tutup shift'}
          </Button>
        </form>
      </SectionCard>

      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
    </div>
  );
}
