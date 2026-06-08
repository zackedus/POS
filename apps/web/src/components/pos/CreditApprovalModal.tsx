'use client';

import { useState } from 'react';
import { Button } from '@barokah/ui';
import { formatCurrencyIDR, UserRole } from '@barokah/shared';
import { requestCreditApproval } from '@/lib/finance-api';

interface CreditApprovalModalProps {
  customerId: string;
  customerName: string;
  creditAmount: number;
  userRole: string;
  outletId?: string | null;
  onApproved: (approvalToken: string) => void;
  onClose: () => void;
}

export function CreditApprovalModal({
  customerId,
  customerName,
  creditAmount,
  userRole,
  outletId,
  onApproved,
  onClose,
}: CreditApprovalModalProps) {
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsManagerCredentials =
    userRole !== UserRole.OWNER && userRole !== UserRole.MANAGER;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await requestCreditApproval({
        customerId,
        creditAmount,
        outletId: outletId ?? undefined,
        ...(needsManagerCredentials
          ? {
              managerEmail: managerEmail.trim(),
              managerPassword,
            }
          : {}),
      });
      onApproved(result.approvalToken);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Persetujuan manager gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    (!needsManagerCredentials || (managerEmail.trim().length > 0 && managerPassword.length > 0));

  return (
    <div
      role="dialog"
      aria-label="Persetujuan over-limit"
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
        <h3 style={{ margin: 0 }}>Persetujuan Over-Limit</h3>
        <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
          {customerName} · Tempo {formatCurrencyIDR(creditAmount)}
        </p>

        {needsManagerCredentials ? (
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
            Kasir wajib minta manager memasukkan email dan password. Kasir tidak boleh approve
            transaksi sendiri.
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
            Anda login sebagai manager/owner — persetujuan akan diterbitkan otomatis.
          </div>
        )}

        {needsManagerCredentials ? (
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
          <Button type="button" disabled={!canSubmit} onClick={() => void handleSubmit()}>
            {submitting ? 'Memproses…' : 'Setujui & Lanjut Checkout'}
          </Button>
          <Button type="button" variant="ghost" disabled={submitting} onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
