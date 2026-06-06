'use client';

import { useState } from 'react';
import { Button } from '@barokah/ui';
import { formatCurrencyIDR, UserRole } from '@barokah/shared';
import {
  TransactionApiError,
  voidTransaction,
  getVoidErrorMessage,
  type RecentTransactionSummary,
} from '@/lib/transactions';

interface VoidTransactionModalProps {
  transaction: RecentTransactionSummary;
  userRole: string;
  onSuccess: (message: string) => void;
  onClose: () => void;
}

export function VoidTransactionModal({
  transaction,
  userRole,
  onSuccess,
  onClose,
}: VoidTransactionModalProps) {
  const [reason, setReason] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsManagerApproval =
    userRole !== UserRole.OWNER && userRole !== UserRole.MANAGER;
  const canSubmit =
    reason.trim().length >= 3 &&
    (!needsManagerApproval || (managerEmail.trim().length > 0 && managerPassword.length > 0));

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await voidTransaction(transaction.id, {
        reason: reason.trim(),
        ...(needsManagerApproval
          ? {
              managerEmail: managerEmail.trim(),
              managerPassword,
            }
          : {}),
      });
      onSuccess(`Void berhasil (${result.receiptNo}). Stok dikembalikan.`);
      onClose();
    } catch (err) {
      if (err instanceof TransactionApiError) {
        setError(getVoidErrorMessage(err.code, err.message));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Void transaksi gagal. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (transaction.status === 'VOID') {
    return (
      <div
        role="dialog"
        aria-label="Void transaksi"
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
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', maxWidth: 420, width: '100%' }}>
          <p style={{ margin: 0, color: '#64748b' }}>Transaksi {transaction.receiptNo} sudah di-void.</p>
          <Button type="button" variant="secondary" onClick={onClose} style={{ marginTop: '1rem' }}>
            Tutup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Void transaksi"
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
          maxWidth: 460,
          width: '100%',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        <h3 style={{ margin: 0 }}>Void Transaksi</h3>
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          {transaction.receiptNo} · {formatCurrencyIDR(transaction.total)} ·{' '}
          {transaction.cashierName}
        </p>

        {needsManagerApproval ? (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 8,
              padding: '0.65rem 0.75rem',
              fontSize: '0.85rem',
              color: '#92400e',
            }}
          >
            Persetujuan manager wajib. Minta manager memasukkan email dan password di bawah.
          </div>
        ) : (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #86efac',
              borderRadius: 8,
              padding: '0.65rem 0.75rem',
              fontSize: '0.85rem',
              color: '#166534',
            }}
          >
            Anda login sebagai manager/owner — void akan disetujui otomatis.
          </div>
        )}

        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span style={{ fontSize: '0.88rem' }}>Alasan void (wajib)</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Contoh: Salah input item / pelanggan batal"
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem', resize: 'vertical' }}
          />
        </label>

        {needsManagerApproval ? (
          <>
            <label style={{ display: 'grid', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.88rem' }}>Email manager</span>
              <input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                placeholder="manager@barokah.local"
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem' }}
              />
            </label>
            <label style={{ display: 'grid', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.88rem' }}>Password manager</span>
              <input
                type="password"
                value={managerPassword}
                onChange={(e) => setManagerPassword(e.target.value)}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '0.55rem' }}
              />
            </label>
          </>
        ) : null}

        {error ? (
          <p style={{ margin: 0, color: '#b91c1c', background: '#fee2e2', borderRadius: 8, padding: '0.6rem' }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button type="button" disabled={!canSubmit || submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Memproses void...' : 'Konfirmasi Void'}
          </Button>
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
