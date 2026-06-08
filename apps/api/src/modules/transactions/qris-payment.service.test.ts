import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentMethod } from '@barokah/shared';
import { QrisPaymentService } from './qris-payment.service';

function createUser() {
  return {
    sub: 'cashier-1',
    tenantId: 'tenant-1',
    outletId: 'outlet-1',
    outletIds: ['outlet-1'],
    role: 'CASHIER',
  } as never;
}

test('QRIS: initiate creates pending session with mock payload', async () => {
  let checkoutCalled = false;
  const transactionsService = {
    findExistingTransactionByRequestPublic: async () => null,
    previewCheckoutTotal: async () => ({ subtotal: 100000, discount: 0, tax: 0, total: 100000 }),
    checkoutSplit: async () => {
      checkoutCalled = true;
      return { id: 'txn-qris-1', receiptNo: 'TRX-QRIS-1', total: 100000 };
    },
  };

  const service = new QrisPaymentService(transactionsService as never);
  const initiated = await service.initiate(createUser(), {
    items: [{ productId: 'prod-1', quantity: 1 }],
    clientRequestId: 'req-qris-1',
  });

  assert.equal(initiated.status, 'PENDING');
  assert.match(initiated.qrPayload, /ID\.QRIS\.MOCK/);
  assert.equal(initiated.amount, 100000);

  const status = await service.confirmMockPayment(createUser(), initiated.paymentId);
  assert.equal(status.status, 'PAID');
  assert.equal(status.receiptNo, 'TRX-QRIS-1');
  assert.equal(checkoutCalled, true);
  service.clearSessionsForTests();
});

test('QRIS: checkoutSplit uses QRIS method and reference', async () => {
  let capturedPayments: Array<{ method: PaymentMethod; amount: number; reference?: string }> = [];
  const transactionsService = {
    findExistingTransactionByRequestPublic: async () => null,
    previewCheckoutTotal: async () => ({ subtotal: 50000, discount: 0, tax: 0, total: 50000 }),
    checkoutSplit: async (_user: unknown, dto: { payments: typeof capturedPayments }) => {
      capturedPayments = dto.payments;
      return { id: 'txn-2', receiptNo: 'TRX-2', total: 50000 };
    },
  };

  const service = new QrisPaymentService(transactionsService as never);
  const initiated = await service.initiate(createUser(), {
    items: [{ productId: 'prod-1', quantity: 1 }],
  });
  await service.confirmMockPayment(createUser(), initiated.paymentId);

  assert.equal(capturedPayments[0]?.method, PaymentMethod.QRIS);
  assert.equal(capturedPayments[0]?.amount, 50000);
  assert.ok(capturedPayments[0]?.reference?.startsWith('QRIS-'));
  service.clearSessionsForTests();
});

test('QRIS: getStatus auto-confirms pending mock session after delay', async () => {
  let checkoutCalled = false;
  const transactionsService = {
    findExistingTransactionByRequestPublic: async () => null,
    previewCheckoutTotal: async () => ({ subtotal: 332500, discount: 0, tax: 0, total: 332500 }),
    checkoutSplit: async () => {
      checkoutCalled = true;
      return { id: 'txn-qris-auto', receiptNo: 'TRX-QRIS-AUTO', total: 332500 };
    },
  };

  const service = new QrisPaymentService(transactionsService as never);
  const initiated = await service.initiate(createUser(), {
    items: [{ productId: 'prod-cat-25l', quantity: 1 }],
    clientRequestId: 'req-qris-auto',
  });

  assert.equal(initiated.status, 'PENDING');

  const realDateNow = Date.now;
  Date.now = () => realDateNow() + 4000;
  try {
    const status = await service.getStatus(createUser(), initiated.paymentId);
    assert.equal(status.status, 'PAID');
    assert.equal(status.total, 332500);
    assert.equal(checkoutCalled, true);
  } finally {
    Date.now = realDateNow;
    service.clearSessionsForTests();
  }
});

test('QRIS: getStatus returns FAILED instead of throwing when checkout fails', async () => {
  const transactionsService = {
    findExistingTransactionByRequestPublic: async () => null,
    previewCheckoutTotal: async () => ({ subtotal: 100000, discount: 0, tax: 0, total: 100000 }),
    checkoutSplit: async () => {
      throw new Error('Shift belum dibuka');
    },
  };

  const service = new QrisPaymentService(transactionsService as never);
  const initiated = await service.initiate(createUser(), {
    items: [{ productId: 'prod-1', quantity: 1 }],
  });

  const realDateNow = Date.now;
  Date.now = () => realDateNow() + 4000;
  try {
    const status = await service.getStatus(createUser(), initiated.paymentId);
    assert.equal(status.status, 'FAILED');
  } finally {
    Date.now = realDateNow;
    service.clearSessionsForTests();
  }
});
