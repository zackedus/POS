'use client';

import { formatPhoneDisplay } from '@barokah/shared';
import type { ShippingLabelData } from '@/lib/online-orders-api';

const LABEL_ELEMENT_ID = 'barokah-shipping-label-print';

function formatLabelDate(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function shippingLabelElementId(): string {
  return LABEL_ELEMENT_ID;
}

export interface ShippingLabelPrintProps {
  data: ShippingLabelData;
}

export function ShippingLabelPrint({ data }: ShippingLabelPrintProps) {
  const phoneDisplay = formatPhoneDisplay(data.to.phone);

  return (
    <div
      id={LABEL_ELEMENT_ID}
      style={{
        width: '100mm',
        minHeight: '148mm',
        padding: '8mm',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
        color: '#0f172a',
        background: '#fff',
      }}
    >
      <div style={{ border: '2px solid #0f172a', borderRadius: 8, padding: '6mm', height: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '4mm' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#475569' }}>
            LABEL PENGIRIMAN
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{data.deliveryTypeLabel}</div>
          <div style={{ fontSize: 12, marginTop: 4, color: '#334155' }}>{data.serviceName}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '3mm',
            fontSize: 11,
            marginBottom: '4mm',
            paddingBottom: '3mm',
            borderBottom: '1px dashed #cbd5e1',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: 10 }}>NO. ORDER</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{data.orderNo}</div>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: 10 }}>NO. PENGIRIMAN</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>
              {data.delivery?.deliveryNo ?? '—'}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontWeight: 700, color: '#64748b', fontSize: 10 }}>TANGGAL</div>
            <div>{formatLabelDate(data.orderDate)}</div>
          </div>
        </div>

        <div style={{ marginBottom: '4mm' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: '#fff',
              background: '#0f172a',
              padding: '2mm 3mm',
              borderRadius: 4,
              marginBottom: '2mm',
            }}
          >
            DARI (PENGIRIM)
          </div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{data.from.storeName}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{data.from.outletName}</div>
          <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.45 }}>{data.from.address || '—'}</div>
          {data.from.phone ? (
            <div style={{ fontSize: 11, marginTop: 4 }}>Telp: {formatPhoneDisplay(data.from.phone)}</div>
          ) : null}
        </div>

        <div style={{ marginBottom: '4mm' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 0.5,
              color: '#fff',
              background: '#0369a1',
              padding: '2mm 3mm',
              borderRadius: 4,
              marginBottom: '2mm',
            }}
          >
            UNTUK (PENERIMA)
          </div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>{data.to.name}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{phoneDisplay}</div>
          <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, fontWeight: 500 }}>{data.to.address}</div>
        </div>

        <div style={{ marginBottom: '3mm' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>ISI PAKET</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, lineHeight: 1.5 }}>
            {data.items.map((item) => (
              <li key={`${item.sku}-${item.productName}`}>
                {item.quantity}× {item.productName}
              </li>
            ))}
          </ul>
        </div>

        {data.notes ? (
          <div style={{ fontSize: 10, color: '#475569', borderTop: '1px dashed #cbd5e1', paddingTop: '2mm' }}>
            Catatan: {data.notes}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function printShippingLabel(elementId = LABEL_ELEMENT_ID): void {
  if (typeof window === 'undefined') {
    return;
  }

  const node = document.getElementById(elementId);
  if (!node) {
    return;
  }

  const printWindow = window.open('', '_blank', 'width=460,height=720');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Label Pengiriman</title>
        <style>
          @page { size: 100mm 148mm; margin: 0; }
          html, body { margin: 0; padding: 0; background: #fff; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        </style>
      </head>
      <body>${node.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}
