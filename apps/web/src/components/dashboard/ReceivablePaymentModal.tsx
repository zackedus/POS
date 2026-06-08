'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  formatCurrencyIDR,
  parseCurrencyInput,
  RECEIVABLE_PAYMENT_METHOD_LABELS,
  RECEIVABLE_SETTLEMENT_METHODS,
} from '@barokah/shared';
import { Button, CurrencyInput } from '@barokah/ui';
import { mapApiError } from '@/lib/api-client';
import {
  recordCustomerReceivablePayment,
  recordReceivablePayment,
  type ReceivableRow,
} from '@/lib/receivables-api';

export interface ReceivablePaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  customerId?: string;
  customerName?: string;
  depositBalance?: number;
  receivables?: ReceivableRow[];
  shiftId?: string | null;
}

export function ReceivablePaymentModal({
  open,
  onClose,
  onSuccess,
  customerId,
  customerName,
  depositBalance = 0,
  receivables = [],
  shiftId,
}: ReceivablePaymentModalProps) {
  const openRows = useMemo(
    () => receivables.filter((r) => r.outstanding > 0),
    [receivables],
  );
  const [receivableId, setReceivableId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('CASH');
  const [transferReference, setTransferReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [fifoMode, setFifoMode] = useState(Boolean(customerId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRowsKey = useMemo(
    () => openRows.map((r) => `${r.id}:${r.outstanding}`).join('|'),
    [openRows],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (openRows.length === 1) {
      setReceivableId(openRows[0]!.id);
      setAmount(String(openRows[0]!.outstanding));
    } else {
      setReceivableId('');
      setAmount('');
    }
  }, [open, openRowsKey, openRows]);

  if (!open) return null;

  const selected = openRows.find((r) => r.id === receivableId);
  const maxAmount = fifoMode
    ? openRows.reduce((sum, r) => sum + r.outstanding, 0)
    : (selected?.outstanding ?? 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseCurrencyInput(amount);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setError('Nominal pembayaran harus angka bulat minimal Rp 1.');
      return;
    }
    if (parsed > maxAmount) {
      setError(`Nominal melebihi sisa piutang (maks ${formatCurrencyIDR(maxAmount)}).`);
      return;
    }
    if (method === 'TRANSFER' && !transferReference.trim()) {
      setError('No. referensi transfer wajib diisi.');
      return;
    }
    if (method === 'DEPOSIT' && parsed > depositBalance) {
      setError(`Saldo deposit tidak mencukupi (tersedia ${formatCurrencyIDR(depositBalance)}).`);
      return;
    }
    if ((!fifoMode || !customerId) && !receivableId) {
      setError('Pilih piutang terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        amount: parsed,
        method,
        transferReference: transferReference.trim() || undefined,
        bankName: bankName.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        shiftId: shiftId ?? undefined,
      };

      if (customerId && fifoMode) {
        await recordCustomerReceivablePayment(customerId, {
          ...body,
          receivableId: receivableId || undefined,
        });
      } else if (receivableId) {
        await recordReceivablePayment(receivableId, body);
      } else {
        setError('Data piutang tidak lengkap.');
        return;
      }
      onSuccess('Pembayaran piutang berhasil dicatat.');
      onClose();
    } catch (err) {
      setError(mapApiError(err, 'Gagal mencatat pembayaran.'));
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    display: 'block' as const,
    width: '100%',
    marginTop: 4,
    padding: '0.5rem',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.25rem',
          maxWidth: 440,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Catat Pembayaran Piutang</h2>
        {customerName ? (
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#64748b' }}>
            Pelanggan: <strong>{customerName}</strong>
            {depositBalance > 0 ? ` · Deposit ${formatCurrencyIDR(depositBalance)}` : ''}
          </p>
        ) : null}

        {error ? (
          <p style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>{error}</p>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'grid', gap: '0.75rem' }}>
          {customerId && openRows.length > 1 ? (
            <label style={{ fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={fifoMode}
                onChange={(e) => setFifoMode(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Bayar piutang tertua dulu (FIFO)
            </label>
          ) : null}

          {!fifoMode || !customerId ? (
            <label style={{ fontSize: '0.875rem' }}>
              Piutang
              <select
                value={receivableId}
                onChange={(e) => {
                  setReceivableId(e.target.value);
                  const row = openRows.find((r) => r.id === e.target.value);
                  if (row) setAmount(String(row.outstanding));
                }}
                style={inputStyle}
              >
                <option value="">— Pilih —</option>
                {openRows.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.transaction?.receiptNo ?? r.id.slice(0, 8)} — sisa{' '}
                    {formatCurrencyIDR(r.outstanding)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <CurrencyInput label="Nominal" value={amount} onChange={setAmount} />
          {maxAmount > 0 ? (
            <small style={{ color: '#64748b' }}>Maks: {formatCurrencyIDR(maxAmount)}</small>
          ) : null}

          <label style={{ fontSize: '0.875rem' }}>
            Metode
            <select value={method} onChange={(e) => setMethod(e.target.value)} style={inputStyle}>
              {RECEIVABLE_SETTLEMENT_METHODS.map((m: string) => (
                <option key={m} value={m}>
                  {RECEIVABLE_PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {method === 'TRANSFER' ? (
            <>
              <label style={{ fontSize: '0.875rem' }}>
                No. Referensi Transfer <span style={{ color: '#b91c1c' }}>*</span>
                <input
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="Contoh: TRF-20260609-001"
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: '0.875rem' }}>
                Nama Bank
                <input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BCA, Mandiri, BRI…"
                  style={inputStyle}
                />
              </label>
            </>
          ) : null}

          {(method === 'TRANSFER' || method === 'QRIS') && (
            <label style={{ fontSize: '0.875rem' }}>
              URL Bukti Pembayaran (opsional)
              <input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </label>
          )}

          <label style={{ fontSize: '0.875rem' }}>
            Catatan (opsional)
            <input value={notes} onChange={(e) => setNotes(e.target.value)} style={inputStyle} />
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button type="submit" disabled={submitting || openRows.length === 0}>
              {submitting ? 'Menyimpan…' : 'Simpan Pembayaran'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
