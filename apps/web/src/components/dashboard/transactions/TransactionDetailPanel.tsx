'use client';

import Link from 'next/link';
import { formatCurrencyIDR, type SalePurchaseListItem } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { AlertBanner, cardStyle } from '@/components/dashboard/dashboard-ui';
import { ReceiptPanel } from '@/components/pos/ReceiptPanel';
import type { ReceiptResponse } from '@/lib/transactions';
import { printReceiptBrowser } from '@/lib/thermal-print';
import { SaleSourceBadge, saleDisplayStatusVariant } from './sale-badges';
import { StatusBadge } from '@/components/dashboard/dashboard-ui';

interface TransactionDetailPanelProps {
  row: SalePurchaseListItem;
  receiptPreview: ReceiptResponse | null;
  loadingReceipt: boolean;
  onLoadReceipt: () => void;
  onClose: () => void;
  onVoid?: () => void;
}

export function TransactionDetailPanel({
  row,
  receiptPreview,
  loadingReceipt,
  onLoadReceipt,
  onClose,
  onVoid,
}: TransactionDetailPanelProps) {
  const showReceipt =
    row.recordType === 'TRANSACTION' &&
    receiptPreview?.receipt.transactionId === (row.transactionId ?? row.id);

  return (
    <div
      role="dialog"
      aria-label={`Detail pembelian ${row.receiptNo}`}
      style={{
        ...cardStyle(),
        border: '1px solid #cbd5e1',
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <strong style={{ fontSize: '1.125rem' }}>{row.receiptNo}</strong>
            <SaleSourceBadge sourceType={row.sourceType} label={row.sourceLabel} />
            <StatusBadge
              label={row.displayStatusLabel}
              variant={saleDisplayStatusVariant(row.displayStatus)}
            />
          </div>
          <p style={{ margin: '0.5rem 0 0', color: '#475569', fontSize: '0.9375rem' }}>
            {formatCurrencyIDR(row.total)}
            {row.customerName ? ` · ${row.customerName}` : ' · Walk-in'}
            {row.paymentMethodLabel ? ` · ${row.paymentMethodLabel}` : ''}
          </p>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.8125rem' }}>
            {row.outletName}
            {row.cashierName ? ` · Kasir: ${row.cashierName}` : ''}
            {row.completedAt
              ? ` · ${new Date(row.completedAt).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : ''}
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onClose}>
          Tutup
        </Button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        {row.canReprint ? (
          <Button type="button" variant="secondary" disabled={loadingReceipt} onClick={onLoadReceipt}>
            {loadingReceipt ? 'Memuat…' : showReceipt ? 'Muat ulang struk' : 'Cetak / pratinjau struk'}
          </Button>
        ) : null}
        {row.canVoid && onVoid ? (
          <Button type="button" variant="secondary" onClick={onVoid}>
            Void transaksi
          </Button>
        ) : null}
        {row.deliveryId ? (
          <Link href={`/dashboard/deliveries?id=${row.deliveryId}`}>
            <Button type="button" variant="ghost">
              Lihat pengiriman
            </Button>
          </Link>
        ) : null}
        {row.receivableId ? (
          <Link href={`/dashboard/finance?tab=piutang`}>
            <Button type="button" variant="ghost">
              Lihat piutang
            </Button>
          </Link>
        ) : null}
        {row.onlineOrderId ? (
          <Link href={`/dashboard/online-orders?id=${row.onlineOrderId}`}>
            <Button type="button" variant="ghost">
              Lihat pesanan online
            </Button>
          </Link>
        ) : null}
      </div>

      {row.recordType === 'ONLINE_ORDER' ? (
        <AlertBanner variant="info">
          Pembelian ini berasal dari pesanan online. Void hanya berlaku untuk transaksi kasir POS — batalkan pesanan
          dari halaman Pesanan Web jika diperlukan.
        </AlertBanner>
      ) : null}

      {showReceipt ? (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
          <ReceiptPanel
            receipt={receiptPreview.receipt}
            escpos={receiptPreview.escpos}
            onPrint={() => printReceiptBrowser('barokah-receipt-print')}
            onClose={onClose}
          />
        </div>
      ) : null}
    </div>
  );
}
