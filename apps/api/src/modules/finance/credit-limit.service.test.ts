import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import {
  CREDIT_AUTO_INCREASE_AMOUNT_IDR,
  CREDIT_AUTO_INCREASE_THRESHOLD_IDR,
  DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR,
  ErrorCodes,
} from '@barokah/shared';
import { UserRole } from '@barokah/database';
import { CreditLimitService } from './credit-limit.service';

function makeCreditLimitService(deps: {
  prisma?: Record<string, unknown>;
  financeCheckout?: Partial<{
    getCustomerOutstandingReceivableIdr: (tenantId: string, customerId: string) => Promise<number>;
    getCustomerFinanceSummary: (tenantId: string, customerId: string) => Promise<unknown>;
  }>;
}) {
  const prisma = deps.prisma ?? {};
  const financeCheckout = {
    getCustomerOutstandingReceivableIdr: async () => 0,
    getCustomerFinanceSummary: async () => ({}),
    ...deps.financeCheckout,
  };
  return new CreditLimitService(prisma as never, financeCheckout as never);
}

test('CreditLimitService: recalculateAutoLimit increases after paid threshold', async () => {
  let updatedLimit: number | null = null;
  const auditLogs: Array<{ action: string; newLimit: number | null }> = [];

  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        creditLimit: { toString: () => String(DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR) },
        autoLimitEnabled: true,
      }),
      update: async ({ data }: { data: { creditLimit: { toString(): string } } }) => {
        updatedLimit = Number(data.creditLimit.toString());
        return {};
      },
    },
    receivable: {
      count: async () => 0,
      findMany: async () => [
        { amount: { toString: () => String(CREDIT_AUTO_INCREASE_THRESHOLD_IDR) } },
      ],
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        customer: {
          update: async ({ data }: { data: { creditLimit: { toString(): string } } }) => {
            updatedLimit = Number(data.creditLimit.toString());
          },
        },
        customerCreditAuditLog: {
          create: async ({ data }: { data: { action: string; newLimit: { toString(): string } | null } }) => {
            auditLogs.push({
              action: data.action,
              newLimit: data.newLimit ? Number(data.newLimit.toString()) : null,
            });
          },
        },
      }),
  };

  const service = makeCreditLimitService({ prisma });
  const increased = await service.recalculateAutoLimit('tenant-1', 'cust-1');

  assert.equal(increased, true);
  assert.equal(
    updatedLimit,
    DEFAULT_CUSTOMER_CREDIT_LIMIT_IDR + CREDIT_AUTO_INCREASE_AMOUNT_IDR,
  );
  assert.equal(auditLogs[0]?.action, 'LIMIT_AUTO_INCREASE');
});

test('CreditLimitService: recalculateAutoLimit skips when overdue exists', async () => {
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        creditLimit: { toString: () => '1000000' },
        autoLimitEnabled: true,
      }),
    },
    receivable: {
      count: async () => 1,
    },
  };

  const service = makeCreditLimitService({ prisma });
  const increased = await service.recalculateAutoLimit('tenant-1', 'cust-1');
  assert.equal(increased, false);
});

test('CreditLimitService: issueCreditApproval denies cashier self-approval', async () => {
  const passwordHash = bcrypt.hashSync('secret', 4);
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        creditLimit: { toString: () => '1000000' },
      }),
    },
    user: {
      findFirst: async () => ({
        id: 'cashier-1',
        passwordHash,
      }),
    },
  };

  const service = makeCreditLimitService({
    prisma,
    financeCheckout: {
      getCustomerOutstandingReceivableIdr: async () => 900_000,
    },
  });

  await assert.rejects(
    () =>
      service.issueCreditApproval(
        {
          sub: 'cashier-1',
          tenantId: 'tenant-1',
          role: UserRole.CASHIER,
          email: 'cashier@test.local',
          outletIds: ['outlet-1'],
        },
        {
          customerId: 'cust-1',
          creditAmount: 200_000,
          managerEmail: 'cashier@test.local',
          managerPassword: 'secret',
        },
      ),
    (error: unknown) =>
      error instanceof ForbiddenException &&
      (error.getResponse() as { code?: string }).code === ErrorCodes.CREDIT_APPROVAL_SELF_DENIED,
  );
});

test('CreditLimitService: validateAndConsumeApprovalToken allows checkout override', () => {
  const service = makeCreditLimitService({});
  service.clearApprovalTokensForTests();

  const internal = service as unknown as {
    approvalTokens: Map<string, unknown>;
  };
  internal.approvalTokens.set('token-abc', {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    creditAmount: 200_000,
    approvedById: 'manager-1',
    expiresAt: Date.now() + 60_000,
  });

  const result = service.validateAndConsumeApprovalToken('token-abc', {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    creditAmount: 200_000,
  });

  assert.equal(result.approvedById, 'manager-1');
});

test('CreditLimitService: validateAndConsumeApprovalToken rejects expired token', () => {
  const service = makeCreditLimitService({});
  service.clearApprovalTokensForTests();

  const internal = service as unknown as {
    approvalTokens: Map<string, unknown>;
  };
  internal.approvalTokens.set('expired', {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    creditAmount: 200_000,
    approvedById: 'manager-1',
    expiresAt: Date.now() - 1,
  });

  assert.throws(
    () =>
      service.validateAndConsumeApprovalToken('expired', {
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        creditAmount: 200_000,
      }),
    (error: unknown) =>
      error instanceof UnprocessableEntityException &&
      (error.getResponse() as { code?: string }).code === ErrorCodes.CREDIT_APPROVAL_INVALID,
  );
});

test('CreditLimitService: setCreditLimit writes LIMIT_SET audit', async () => {
  const auditActions: string[] = [];
  const prisma = {
    customer: {
      findFirst: async () => ({
        id: 'cust-1',
        tenantId: 'tenant-1',
        name: 'Budi',
        phone: '628123',
        memberCode: 'MBR-001',
        points: 0,
        creditLimit: { toString: () => '1000000' },
        autoLimitEnabled: true,
      }),
      update: async () => ({
        id: 'cust-1',
        name: 'Budi',
        phone: '628123',
        memberCode: 'MBR-001',
        points: 0,
        creditLimit: { toString: () => '2000000' },
        autoLimitEnabled: true,
      }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        customer: {
          update: async () => ({
            id: 'cust-1',
            name: 'Budi',
            phone: '628123',
            memberCode: 'MBR-001',
            points: 0,
            creditLimit: { toString: () => '2000000' },
            autoLimitEnabled: true,
          }),
        },
        customerCreditAuditLog: {
          create: async ({ data }: { data: { action: string } }) => {
            auditActions.push(data.action);
          },
        },
      }),
  };

  const service = makeCreditLimitService({ prisma });
  await service.setCreditLimit(
    {
      sub: 'owner-1',
      tenantId: 'tenant-1',
      role: UserRole.OWNER,
      email: 'owner@test.local',
      outletIds: [],
    },
    'cust-1',
    { creditLimit: 2_000_000, notes: 'Manual override' },
  );

  assert.deepEqual(auditActions, ['LIMIT_SET']);
});
