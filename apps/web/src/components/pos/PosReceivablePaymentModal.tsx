'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { ReceivablePaymentModal } from '@/components/dashboard/ReceivablePaymentModal';
import { ReceivablePaymentHistoryTable } from '@/components/dashboard/ReceivablePaymentHistoryTable';
import { mapApiError } from '@/lib/api-client';
import {
  fetchCustomerPaymentHistory,
  fetchReceivables,
  type ReceivableRow,
} from '@/lib/receivables-api';
import type { ReceivablePaymentView } from '@barokah/shared';

export interface PosReceivablePaymentModalProps {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  depositBalance?: number;
  shiftId?: string | null;
  onSuccess?: (message: string) => void;
}

export function PosReceivablePaymentModal({
  open,
  onClose,
  customerId,
  customerName,
  customerPhone,
  depositBalance = 0,
  shiftId,
  onSuccess,
}: PosReceivablePaymentModalProps) {
  const [receivables, setReceivables] = useState<ReceivableRow[]>([]);
  const [payments, setPayments] = useState<ReceivablePaymentView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [recv, history] = await Promise.all([
        fetchReceivables({ customerId, status: 'OPEN' }).then((rows) =>
          rows.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL'),
        ),
        fetchCustomerPaymentHistory(customerId),
      ]);
      setReceivables(recv);
      setPayments(history.payments);
    } catch (err) {
      setError(mapApiError(err, 'Gagal memuat data piutang.'));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const totalOutstanding = receivables.reduce((sum, r) => sum + r.outstanding, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
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
          maxWidth: 720,
          width: '100%',
          maxHeight: '92vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Terima Pembayaran Piutang</h2>
            <p style={{ margin: '0.35rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
              {customerName}
              {customerPhone ? ` · ${customerPhone}` : ''}
            </p>
            <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>
              Total outstanding: {formatCurrencyIDR(totalOutstanding)}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Tutup
          </Button>
        </div>

        {error ? (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0.75rem 0' }}>{error}</p>
        ) : null}

        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <Button
            type="button"
            variant="primary"
            disabled={totalOutstanding <= 0}
            onClick={() => setShowPayForm(true)}
          >
            Catat Pembayaran
          </Button>
        </div>

        <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem' }}>Riwayat Pembayaran</h3>
        <ReceivablePaymentHistoryTable
          payments={payments}
          customerName={customerName}
          customerPhone={customerPhone}
          loading={loading}
        />

        <ReceivablePaymentModal
          open={showPayForm}
          onClose={() => setShowPayForm(false)}
          onSuccess={(msg) => {
            onSuccess?.(msg);
            setShowPayForm(false);
            void load();
          }}
          customerId={customerId}
          customerName={customerName}
          depositBalance={depositBalance}
          receivables={receivables}
          shiftId={shiftId}
        />
      </div>
    </div>
  );
}
