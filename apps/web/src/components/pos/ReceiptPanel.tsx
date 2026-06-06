'use client';

import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import type { DigitalReceipt, EscPosStub } from '@/lib/transactions';
import {
  formatReceiptDateTime,
  formatEscPosIntegrationHint,
  formatWebUsbIntegrationHint,
  paymentMethodLabel,
} from '@/lib/thermal-print';

interface ReceiptPanelProps {
  receipt: DigitalReceipt;
  escpos?: EscPosStub;
  printElementId?: string;
  onPrint?: () => void;
  onConnectPrinter?: () => void;
  onThermalPrint?: () => void;
  thermalStatus?: string | null;
  onClose?: () => void;
  compact?: boolean;
}

export function ReceiptPanel({
  receipt,
  escpos,
  printElementId = 'barokah-receipt-print',
  onPrint,
  onConnectPrinter,
  onThermalPrint,
  thermalStatus,
  onClose,
  compact = false,
}: ReceiptPanelProps) {
  const isVoided = receipt.status === 'VOID';
  const cashPayment = receipt.payments.find((p) => p.method === 'CASH');
  const cashReceived = cashPayment?.amount;
  const change =
    typeof cashReceived === 'number' && cashReceived >= receipt.total
      ? cashReceived - receipt.total
      : null;

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div
        id={printElementId}
        style={{
          maxWidth: 280,
          margin: '0 auto',
          border: '1px dashed #94a3b8',
          borderRadius: 8,
          padding: '0.85rem',
          background: '#fff',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.78rem',
          lineHeight: 1.45,
          color: '#0f172a',
        }}
      >
        <p style={{ margin: 0, textAlign: 'center', fontWeight: 700 }}>{receipt.tenantName}</p>
        <p style={{ margin: '0.15rem 0', textAlign: 'center' }}>{receipt.outlet.name}</p>
        {receipt.outlet.address ? (
          <p style={{ margin: '0 0 0.4rem', textAlign: 'center', color: '#475569' }}>{receipt.outlet.address}</p>
        ) : null}
        <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.4rem 0' }} />
        <p style={{ margin: 0 }}>No: {receipt.receiptNo}</p>
        <p style={{ margin: '0.1rem 0' }}>{formatReceiptDateTime(receipt.completedAt)}</p>
        <p style={{ margin: '0 0 0.35rem' }}>Kasir: {receipt.cashier.fullName}</p>
        {isVoided ? (
          <p style={{ margin: '0 0 0.35rem', color: '#b91c1c', fontWeight: 700 }}>STATUS: VOID</p>
        ) : null}
        <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.4rem 0' }} />
        {receipt.items.map((item, index) => (
          <div key={`${item.name}-${index}`} style={{ marginBottom: '0.25rem' }}>
            <div>{item.name}</div>
            <div style={{ color: '#334155' }}>
              {item.quantity} x {formatCurrencyIDR(item.unitPrice)} = {formatCurrencyIDR(item.subtotal)}
            </div>
          </div>
        ))}
        <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.4rem 0' }} />
        <p style={{ margin: 0 }}>Subtotal {formatCurrencyIDR(receipt.subtotal)}</p>
        {receipt.discount > 0 ? <p style={{ margin: 0 }}>Diskon {formatCurrencyIDR(receipt.discount)}</p> : null}
        {receipt.tax > 0 ? <p style={{ margin: 0 }}>PPN {formatCurrencyIDR(receipt.tax)}</p> : null}
        <p style={{ margin: '0.2rem 0', fontWeight: 700 }}>TOTAL {formatCurrencyIDR(receipt.netTotal)}</p>
        <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.4rem 0' }} />
        {receipt.payments.map((payment, index) => (
          <p key={`${payment.method}-${index}`} style={{ margin: 0 }}>
            {paymentMethodLabel(payment.method)} {formatCurrencyIDR(payment.amount)}
            {payment.reference ? ` (${payment.reference})` : ''}
          </p>
        ))}
        {change !== null ? <p style={{ margin: '0.15rem 0 0' }}>Kembalian {formatCurrencyIDR(change)}</p> : null}
        {receipt.adjustments.length > 0 ? (
          <div style={{ marginTop: '0.35rem', color: '#b45309' }}>
            {receipt.adjustments.map((adj) => (
              <p key={adj.id} style={{ margin: '0.1rem 0' }}>
                {adj.type}: {formatCurrencyIDR(adj.amount)} — {adj.reason}
              </p>
            ))}
          </div>
        ) : null}
        <p style={{ margin: '0.5rem 0 0', textAlign: 'center' }}>Terima kasih</p>
      </div>

      {escpos && !compact ? (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{formatEscPosIntegrationHint(escpos)}</p>
      ) : null}
      {!compact && (onConnectPrinter || onThermalPrint) ? (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>{formatWebUsbIntegrationHint()}</p>
      ) : null}
      {thermalStatus ? (
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#334155' }}>{thermalStatus}</p>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {onPrint ? (
          <Button type="button" variant="secondary" onClick={onPrint}>
            Cetak Struk
          </Button>
        ) : null}
        {onConnectPrinter ? (
          <Button type="button" variant="ghost" onClick={onConnectPrinter}>
            Hubungkan Printer
          </Button>
        ) : null}
        {onThermalPrint ? (
          <Button type="button" variant="ghost" onClick={onThermalPrint}>
            Cetak Thermal USB
          </Button>
        ) : null}
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        ) : null}
      </div>
    </div>
  );
}
