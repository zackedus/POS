import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReceiptPanel } from './ReceiptPanel';
import type { DigitalReceipt } from '@/lib/transactions';

const sampleReceipt: DigitalReceipt = {
  receiptNo: 'TRX-001',
  transactionId: 'trx-1',
  outlet: { id: 'o1', name: 'Toko Pusat', code: 'TP', address: 'Jl. Contoh' },
  tenantName: 'Barokah Core',
  cashier: { id: 'u1', fullName: 'Kasir A' },
  status: 'COMPLETED',
  items: [{ name: 'Semen', quantity: 2, unitPrice: 70000, subtotal: 140000 }],
  payments: [{ method: 'CASH', amount: 150000, reference: null }],
  subtotal: 140000,
  discount: 0,
  tax: 0,
  total: 140000,
  notes: null,
  completedAt: '2026-06-02T10:00:00.000Z',
  adjustments: [],
  refundedTotal: 0,
  netTotal: 140000,
};

describe('ReceiptPanel', () => {
  it('renders receipt header and line items in Indonesian layout', () => {
    render(
      <ReceiptPanel
        receipt={sampleReceipt}
        onPrint={() => undefined}
        onClose={() => undefined}
      />,
    );

    expect(screen.getByText('Barokah Core')).toBeInTheDocument();
    expect(screen.getByText(/Toko Pusat/)).toBeInTheDocument();
    expect(screen.getByText(/No: TRX-001/)).toBeInTheDocument();
    expect(screen.getByText(/Semen/)).toBeInTheDocument();
    expect(screen.getByText('Cetak Struk')).toBeInTheDocument();
  });

  it('shows VOID badge when transaction voided', () => {
    render(
      <ReceiptPanel
        receipt={{ ...sampleReceipt, status: 'VOID' }}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/STATUS: VOID/)).toBeInTheDocument();
  });
});
