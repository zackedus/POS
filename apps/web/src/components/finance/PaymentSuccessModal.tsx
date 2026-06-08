'use client';

import type { PaymentReceiptView } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { PaymentReceiptPrint } from '@/components/finance/PaymentReceiptPrint';
import { printPaymentReceipt } from '@/lib/payment-receipt-print';

export interface PaymentSuccessModalProps {
  open: boolean;
  message: string;
  receipt: PaymentReceiptView | null;
  onClose: () => void;
}

export function PaymentSuccessModal({ open, message, receipt, onClose }: PaymentSuccessModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem',
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
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="payment-success-title" style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#15803d' }}>
          Berhasil
        </h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155' }}>{message}</p>
        {receipt ? (
          <div
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              marginBottom: '1rem',
              background: '#f8fafc',
            }}
          >
            <PaymentReceiptPrint receipt={receipt} />
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {receipt ? (
            <Button type="button" variant="primary" onClick={() => printPaymentReceipt(receipt)}>
              Cetak Bukti
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
