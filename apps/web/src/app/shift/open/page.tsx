'use client';

import { FormEvent, useEffect, useState } from 'react';
import { formatCurrencyIDR, parseCurrencyInput } from '@barokah/shared';
import { Button, CurrencyInput, Input } from '@barokah/ui';
import { AlertBanner, PageHeader, SectionCard } from '@/components/dashboard/dashboard-ui';
import { apiConfig, toUserFacingError } from '@/lib/api';
import { authFetch, fetchMe, type AuthUser } from '@/lib/auth';

interface ShiftResponse {
  id: string;
  outletId?: string;
  cashierId?: string;
  openingCash: number;
  openedAt: string;
  closedAt?: string | null;
  forceClosed?: boolean;
  forceClosedBy?: string;
  reason?: string | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

export default function OpenShiftPage() {
  const [openingCash, setOpeningCash] = useState('');
  const [loading, setLoading] = useState(false);
  const [forceClosing, setForceClosing] = useState(false);
  const [result, setResult] = useState<ShiftResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [activeShift, setActiveShift] = useState<ShiftResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [forceCloseReason, setForceCloseReason] = useState('');

  const canForceClose = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const user = await fetchMe();
        setCurrentUser(user);
      } catch {
        setCurrentUser(null);
      }
    }

    void loadCurrentUser();
  }, []);

  async function fetchActiveShift() {
    const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/shifts/active`);
    const json = (await res.json()) as ApiEnvelope<ShiftResponse | null>;
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message ?? 'Gagal memuat shift aktif.');
    }
    setActiveShift(json.data ?? null);
    return json.data ?? null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!openingCash.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    setConflictMessage(null);
    setActiveShift(null);
    setResult(null);
    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingCash: parseCurrencyInput(openingCash) }),
      });
      const json = (await res.json()) as ApiEnvelope<ShiftResponse>;
      if (!res.ok || !json.success || !json.data) {
        if (json.error?.code === 'SHIFT_ALREADY_OPEN') {
          setConflictMessage(json.error.message ?? 'Masih ada shift aktif yang belum ditutup.');
          await fetchActiveShift();
        }
        throw new Error(json.error?.message ?? 'Gagal membuka shift.');
      }
      setResult(json.data);
      setOpeningCash('');
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleForceClose() {
    if (!activeShift?.id || !canForceClose) {
      return;
    }

    setForceClosing(true);
    setError(null);

    try {
      const res = await authFetch(`${apiConfig.baseUrl}/${apiConfig.prefix}/shifts/${activeShift.id}/force-close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: forceCloseReason.trim() || undefined,
        }),
      });
      const json = (await res.json()) as ApiEnvelope<ShiftResponse>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error?.message ?? 'Gagal force-close shift aktif.');
      }

      setResult(json.data);
      setConflictMessage(null);
      setActiveShift(null);
      setForceCloseReason('');
    } catch (err) {
      setError(toUserFacingError(err, 'Terjadi kesalahan.'));
    } finally {
      setForceClosing(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <PageHeader
        title="Buka Shift Kasir"
        description="Masukkan saldo awal kas sebelum mulai transaksi. Shift wajib dibuka agar checkout tercatat di laporan harian."
        helpText="Nilai saldo awal digunakan sebagai baseline rekonsiliasi kas di akhir shift."
      />

      <SectionCard title="Form Pembukaan Shift">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <CurrencyInput
            label="Saldo awal kas (IDR)"
            value={openingCash}
            onChange={setOpeningCash}
            placeholder="200.000"
            fullWidth
            disabled={loading}
            style={{ minHeight: 48 }}
          />
          <Button type="submit" disabled={loading || !openingCash.trim()} style={{ minHeight: 48 }}>
            {loading ? 'Memproses…' : 'Buka shift'}
          </Button>
        </form>
      </SectionCard>

      {loading ? <AlertBanner variant="info">Memproses pembukaan shift…</AlertBanner> : null}
      {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}

      {conflictMessage && activeShift ? (
        <SectionCard title="Konflik shift terdeteksi">
          <p style={{ margin: '0 0 0.5rem', color: '#92400e' }}>{conflictMessage}</p>
          <p style={{ margin: '0 0 0.75rem', color: '#78350f', fontSize: '0.875rem' }}>
            Shift aktif: <strong>{activeShift.id}</strong> · Dibuka{' '}
            {new Date(activeShift.openedAt).toLocaleString('id-ID')}
          </p>
          {canForceClose ? (
            <div style={{ display: 'grid', gap: '0.625rem' }}>
              <Input
                label="Alasan force-close (opsional)"
                value={forceCloseReason}
                onChange={(event) => setForceCloseReason(event.target.value)}
                placeholder="Contoh: Shift kasir sebelumnya belum ditutup saat pergantian shift."
                fullWidth
                disabled={forceClosing}
              />
              <Button type="button" disabled={forceClosing} onClick={() => void handleForceClose()}>
                {forceClosing ? 'Memproses force-close…' : 'Force-close shift aktif'}
              </Button>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#78350f', fontSize: '0.875rem' }}>
              Hubungi manager atau owner untuk menutup shift aktif ini sebelum membuka shift baru.
            </p>
          )}
        </SectionCard>
      ) : null}

      {result ? (
        <AlertBanner variant="success">
          <strong>{result.forceClosed ? 'Shift berhasil di-force-close' : 'Shift berhasil dibuka'}</strong>
          <p style={{ margin: '0.5rem 0 0' }}>ID Shift: {result.id}</p>
          <p style={{ margin: '0.25rem 0 0' }}>Saldo awal: {formatCurrencyIDR(result.openingCash)}</p>
          {result.closedAt ? (
            <p style={{ margin: '0.25rem 0 0' }}>Ditutup pada: {new Date(result.closedAt).toLocaleString('id-ID')}</p>
          ) : null}
        </AlertBanner>
      ) : null}
    </div>
  );
}
