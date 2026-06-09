import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaymentMethod } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { TransactionsService } from './transactions.service';

function createUser(): AuthJwtPayload {
  return {
    sub: 'owner-1',
    email: 'owner@barokah.test',
    tenantId: 'tenant-1',
    role: 'OWNER',
    outletIds: ['outlet-1'],
  };
}

function createService() {
  let capturedWhere: Record<string, unknown> | null = null;
  const prisma = {
    transaction: {
      findMany: async (args: { where: Record<string, unknown> }) => {
        capturedWhere = args.where;
        return [];
      },
      count: async () => 0,
    },
    onlineOrder: {
      findMany: async () => [],
    },
  };

  const service = new TransactionsService(
    prisma as never,
    { resolveCheckoutDiscount: async () => ({ discountAmount: 0 }) } as never,
    {
      resolveOptionalCustomerId: async () => null,
      resolveLoyaltyRedeem: async () => ({ pointsRedeemed: 0, discountIdr: 0 }),
      recordLoyaltyRedeemInTransaction: async () => undefined,
      earnPointsForCompletedTransaction: async () => 0,
    } as never,
    {
      getCustomerOutstandingReceivableIdr: async () => 0,
      getCustomerDepositBalanceIdr: async () => 0,
      assertCheckoutFinancePayments: () => undefined,
      applyCheckoutFinanceInTransaction: async () => undefined,
      reverseFinanceForVoid: async () => undefined,
    } as never,
    { validateAndConsumeApprovalToken: () => ({ approvedById: 'manager-1' }), logCreditCheckoutInTransaction: async () => {} } as never,
    { createForCompletedTransaction: async () => ({}) } as never,
  );

  return { service, getWhere: () => capturedWhere };
}

test('Transactions: listRecentTransactions applies paymentMethod filter', async () => {
  const { service, getWhere } = createService();
  await service.listRecentTransactions(createUser(), {
    outletId: 'outlet-1',
    paymentMethod: PaymentMethod.QRIS,
    page: 1,
    limit: 20,
  });

  const where = getWhere();
  assert.deepEqual(where?.payments, { some: { method: PaymentMethod.QRIS } });
});

test('Transactions: listRecentTransactions applies sourceType TOKO filter', async () => {
  const { service, getWhere } = createService();
  await service.listRecentTransactions(createUser(), {
    outletId: 'outlet-1',
    sourceType: 'TOKO',
    page: 1,
    limit: 20,
  });

  const where = getWhere();
  assert.ok(where?.NOT);
});
