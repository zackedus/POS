import type { PaymentMethod } from '@barokah/shared';

export type ReceiptLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReceiptPaymentLine = {
  method: PaymentMethod | string;
  amount: number;
  reference: string | null;
};

export type ReceiptAdjustmentSummary = {
  id: string;
  type: 'VOID' | 'REFUND';
  amount: number;
  reason: string;
  createdAt: Date;
};

export type DigitalReceiptPayload = {
  receiptNo: string;
  transactionId: string;
  outlet: {
    id: string;
    name: string;
    code: string;
    address: string | null;
  };
  tenantName: string;
  cashier: { id: string; fullName: string };
  status: string;
  items: ReceiptLineItem[];
  payments: ReceiptPaymentLine[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  completedAt: Date | null;
  adjustments: ReceiptAdjustmentSummary[];
  refundedTotal: number;
  netTotal: number;
};

/** MVP stub — real ESC/POS driver wired by integration layer (Arif). */
export function buildEscPosStub(receipt: DigitalReceiptPayload): {
  format: 'escpos';
  encoding: 'base64';
  width: number;
  payload: string;
  commands: string[];
} {
  const lines: string[] = [
    '\x1B\x40', // INIT
    `${receipt.tenantName}\n`,
    `${receipt.outlet.name} (${receipt.outlet.code})\n`,
    `No: ${receipt.receiptNo}\n`,
    `Kasir: ${receipt.cashier.fullName}\n`,
    '--------------------------------\n',
    ...receipt.items.map(
      (item) =>
        `${item.name}\n  ${item.quantity} x ${item.unitPrice} = ${item.subtotal}\n`,
    ),
    '--------------------------------\n',
    `TOTAL: ${receipt.netTotal}\n`,
    ...receipt.payments.map((p) => `${p.method}: ${p.amount}\n`),
    '\nTerima kasih\n',
    '\x1D\x56\x00', // CUT
  ];

  const raw = lines.join('');
  return {
    format: 'escpos',
    encoding: 'base64',
    width: 32,
    payload: Buffer.from(raw, 'utf8').toString('base64'),
    commands: ['INIT', 'TEXT', 'CUT'],
  };
}
