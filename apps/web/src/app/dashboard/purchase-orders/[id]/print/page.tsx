'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { LoadingSkeleton } from '@/components/dashboard/dashboard-ui';
import { fetchPurchaseOrder, formatPoDate, type PurchaseOrderDetail } from '@/lib/suppliers-api';

export default function PurchaseOrderPrintPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setOrder(await fetchPurchaseOrder(params.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat order.');
      }
    })();
  }, [params.id]);

  if (error) {
    return <p style={{ padding: '2rem', color: '#b91c1c' }}>{error}</p>;
  }

  if (!order) {
    return (
      <div style={{ padding: '2rem' }}>
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  const printData = order.print;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem', background: '#fff', color: '#0f172a' }}>
        <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <Button type="button" variant="primary" onClick={() => window.print()}>
            Cetak Order
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.close()}>
            Tutup
          </Button>
        </div>

        <header style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Purchase Order — {printData.orderNo}</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#475569' }}>
            {printData.outletName}
            {printData.outletAddress ? ` · ${printData.outletAddress}` : ''}
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <strong>Kepada Distributor</strong>
            <p style={{ margin: '0.35rem 0 0' }}>
              {printData.supplierName}
              <br />
              {printData.supplierPhone ?? ''}
              {printData.supplierEmail ? ` · ${printData.supplierEmail}` : ''}
              {printData.supplierAddress ? (
                <>
                  <br />
                  {printData.supplierAddress}
                </>
              ) : null}
            </p>
          </div>
          <div>
            <strong>Informasi Order</strong>
            <p style={{ margin: '0.35rem 0 0' }}>
              Tgl Order: {formatPoDate(printData.orderedAt)}
              <br />
              Perkiraan Tiba: {formatPoDate(printData.expectedDeliveryAt)}
            </p>
          </div>
        </section>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Produk</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Harga/Unit</th>
              <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {printData.items.map((item, index) => (
              <tr key={`${item.sku}-${index}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.5rem 0' }}>{item.sku}</td>
                <td style={{ padding: '0.5rem 0' }}>{item.productName}</td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>
                  {item.quantity} {item.unitSymbol ?? ''}
                </td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{formatCurrencyIDR(item.unitCost)}</td>
                <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{formatCurrencyIDR(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ paddingTop: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                Total
              </td>
              <td style={{ paddingTop: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                {formatCurrencyIDR(printData.subtotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {printData.notes ? (
          <p style={{ marginBottom: '2rem' }}>
            <strong>Catatan:</strong> {printData.notes}
          </p>
        ) : null}

        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem' }}>
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Disetujui Pemesan</p>
            <div style={{ marginTop: '3rem', borderTop: '1px solid #0f172a', width: '80%' }} />
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Distributor / Pengiriman</p>
            <div style={{ marginTop: '3rem', borderTop: '1px solid #0f172a', width: '80%' }} />
          </div>
        </section>
      </div>
    </>
  );
}
