import type { QrisPaymentStatus } from './qris-payment.service';

export interface QrisInitiateInput {
  paymentId: string;
  amount: number;
  clientRequestId: string;
}

export interface QrisInitiateResult {
  paymentId: string;
  qrPayload: string;
  status: QrisPaymentStatus;
  expiresAt: Date;
}

export interface QrisStatusResult {
  paymentId: string;
  status: QrisPaymentStatus;
  transactionId?: string;
  receiptNo?: string;
  total?: number;
}

/** Provider abstraction for future Xendit/Duitku/Midtrans QRIS live. */
export interface QrisProvider {
  readonly providerId: string;
  initiate(input: QrisInitiateInput): QrisInitiateResult;
  getStatus(paymentId: string): QrisStatusResult | null;
  confirmMock?(paymentId: string): QrisStatusResult | null;
}

export class MockQrisProvider implements QrisProvider {
  readonly providerId = 'mock';

  initiate(input: QrisInitiateInput): QrisInitiateResult {
    return {
      paymentId: input.paymentId,
      qrPayload: `ID.QRIS.MOCK|${input.paymentId}|${input.amount}|BAROKAH-CORE-POS`,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
  }

  getStatus(_paymentId: string): QrisStatusResult | null {
    return null;
  }
}
