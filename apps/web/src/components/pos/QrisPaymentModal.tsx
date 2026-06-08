'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@barokah/ui';
import { formatCurrencyIDR } from '@barokah/shared';
import {
  confirmQrisMockPayment,
  pollQrisStatus,
  type QrisInitiateResult,
  type QrisPaymentStatus,
} from '@/lib/qris-payment';

const QRIS_POLL_INTERVAL_MS = 1500;

interface QrisPaymentModalProps {
  session: QrisInitiateResult | null;
  onClose: () => void;
  onPaid: (result: { transactionId: string; receiptNo: string; total: number }) => void;
}

export function QrisPaymentModal({ session, onClose, onPaid }: QrisPaymentModalProps) {
  const [status, setStatus] = useState<QrisPaymentStatus>('PENDING');
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const paidRef = useRef(false);
  const onPaidRef = useRef(onPaid);

  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const handlePaid = useCallback((result: { transactionId: string; receiptNo: string; total: number }) => {
    if (paidRef.current) {
      return;
    }
    paidRef.current = true;
    onPaidRef.current(result);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (session.status === 'PAID' && session.transactionId && session.receiptNo && session.total != null) {
      handlePaid({
        transactionId: session.transactionId,
        receiptNo: session.receiptNo,
        total: session.total,
      });
      return;
    }

    setStatus(session.status);
    setMessage(null);
    paidRef.current = false;

    const paymentId = session.paymentId;

    const pollOnce = () => {
      void pollQrisStatus(paymentId)
        .then((result) => {
          setStatus(result.status);
          if (result.status === 'PAID' && result.transactionId && result.receiptNo && result.total != null) {
            handlePaid({
              transactionId: result.transactionId,
              receiptNo: result.receiptNo,
              total: result.total,
            });
            return;
          }
          if (result.status === 'EXPIRED' || result.status === 'FAILED') {
            setMessage('Pembayaran QRIS gagal atau kedaluwarsa. Coba lagi.');
          }
        })
        .catch((err: unknown) => {
          setMessage(err instanceof Error ? err.message : 'Polling QRIS gagal.');
        });
    };

    pollOnce();
    const timer = setInterval(pollOnce, QRIS_POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [session, handlePaid]);

  if (!session) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pembayaran QRIS"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.25rem',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem' }}>Bayar via QRIS</h2>
        <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.875rem' }}>
          Total: <strong>{formatCurrencyIDR(session.amount)}</strong> · Status: <strong>{status}</strong>
        </p>

        <div
          style={{
            background: '#f8fafc',
            border: '2px dashed #cbd5e1',
            borderRadius: 8,
            padding: '1rem',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            wordBreak: 'break-all',
            marginBottom: '1rem',
          }}
        >
          {session.qrPayload}
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: '#64748b' }}>
          Mode mock: pembayaran otomatis terkonfirmasi setelah ~{Math.round((session.mockAutoConfirmMs ?? 3000) / 1000)} detik,
          atau klik simulasi bayar.
        </p>

        {message ? <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{message}</p> : null}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            type="button"
            disabled={confirming || status === 'PAID'}
            onClick={() => {
              setConfirming(true);
              void confirmQrisMockPayment(session.paymentId)
                .then((result) => {
                  setStatus(result.status);
                  if (result.transactionId && result.receiptNo && result.total != null) {
                    handlePaid({
                      transactionId: result.transactionId,
                      receiptNo: result.receiptNo,
                      total: result.total,
                    });
                  } else if (result.status === 'FAILED' || result.status === 'EXPIRED') {
                    setMessage('Pembayaran QRIS gagal atau kedaluwarsa. Coba lagi.');
                  }
                })
                .catch((err: unknown) => {
                  setMessage(err instanceof Error ? err.message : 'Konfirmasi gagal.');
                })
                .finally(() => setConfirming(false));
            }}
          >
            {confirming ? 'Memproses…' : 'Simulasi Bayar (Mock)'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
