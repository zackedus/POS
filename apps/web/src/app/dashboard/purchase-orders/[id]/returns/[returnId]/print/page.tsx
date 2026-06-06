'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatCurrencyIDR } from '@barokah/shared';
import { Button } from '@barokah/ui';
import { LoadingSkeleton } from '@/components/dashboard/dashboard-ui';
import {
  PO_RETURN_REASON_LABELS,
  fetchPurchaseOrderReturn,
  formatPoDate,
  type PurchaseOrderReturnDetail,
} from '@/lib/suppliers-api';

export default function PurchaseOrderReturnPrintPage() {
  const params = useParams<{ id: string; returnId: string }>();
  const [ret, setRet] = useState<PurchaseOrderReturnDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setRet(await fetchPurchaseOrderReturn(params.returnId));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat retur.');
      }
    })();
  }, [params.returnId]);

  if (error) {
    return <p style={{ padding: '2rem', color: '#b91c1c' }}>{error}</p>;
  }

  if (!ret) {
    return (
      <div style={{ padding: '2rem' }}>
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  const printData = ret.print;

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
            Cetak Retur
          </Button>
          <Button type="button" variant="secondary" onClick={() => window.close()}>
            Tutup
          </Button>
        </div>

        <header style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Retur Pembelian — {printData.returnNo}</h1>
          <p style={{ margin: '0.35rem 0 0', color: '#475569' }}>
            Ref. Order: {printData.orderNo} · {printData.outletName}
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
            <strong>Informasi Retur</strong>
            <p style={{ margin: '0.35rem 0 0' }}>
              Tgl Retur: {formatPoDate(printData.returnedAt)}
              <br />
              Dibuat oleh: {ret.createdByName}
            </p>
          </div>
        </section>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>SKU</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Produk</th>
              <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Alasan</th>
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
                <td style={{ padding: '0.5rem 0' }}>{PO_RETURN_REASON_LABELS[item.reason]}</td>
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
              <td colSpan={5} style={{ paddingTop: '0.75rem', textAlign: 'right', fontWeight: 700 }}>
                Total Retur
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
            <p style={{ margin: 0, color: '#64748b' }}>Disetujui Toko</p>
            <div style={{ marginTop: '3rem', borderTop: '1px solid #0f172a', width: '80%' }} />
          </div>
          <div>
            <p style={{ margin: 0, color: '#64748b' }}>Distributor / Penerima Retur</p>
            <div style={{ marginTop: '3rem', borderTop: '1px solid #0f172a', width: '80%' }} />
          </div>
        </section>
      </div>
    </>
  );
}
