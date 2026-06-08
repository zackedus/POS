import { Injectable } from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import {
  buildPaymentReceiptNumber,
  PAYMENT_RECEIPT_CODE_BY_KIND,
  PAYMENT_RECEIPT_KIND_TITLES,
  RECEIVABLE_PAYMENT_METHOD_LABELS,
  type PaymentReceiptCode,
  type PaymentReceiptKind,
  type PaymentReceiptView,
} from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PaymentReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async nextReceiptNumber(
    tx: TxClient,
    tenantId: string,
    code: PaymentReceiptCode,
  ): Promise<string> {
    const dateKey = new Date().toISOString().slice(0, 10);
    const sequenceDate = new Date(`${dateKey}T00:00:00.000Z`);
    const sequence = await tx.paymentReceiptSequence.upsert({
      where: {
        tenantId_receiptType_sequenceDate: {
          tenantId,
          receiptType: code,
          sequenceDate,
        },
      },
      create: { tenantId, receiptType: code, sequenceDate, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });
    return buildPaymentReceiptNumber(code, dateKey, sequence.lastValue);
  }

  async getTenantName(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    return tenant?.name ?? 'Barokah Core POS';
  }

  buildReceiptView(params: {
    kind: PaymentReceiptKind;
    receiptNumber: string;
    amount: number;
    method: string;
    createdAt: Date | string;
    recordedByName: string;
    counterpartyName: string;
    counterpartyPhone?: string | null;
    storeName: string;
    outletName?: string | null;
    balanceBefore?: number | null;
    balanceAfter?: number | null;
    outstandingBefore?: number | null;
    outstandingAfter?: number | null;
    transferReference?: string | null;
    bankName?: string | null;
    notes?: string | null;
    referenceLabel?: string | null;
    paymentId?: string;
  }): PaymentReceiptView {
    return {
      receiptNumber: params.receiptNumber,
      kind: params.kind,
      amount: params.amount,
      method: params.method,
      createdAt:
        typeof params.createdAt === 'string'
          ? params.createdAt
          : params.createdAt.toISOString(),
      recordedByName: params.recordedByName,
      counterpartyName: params.counterpartyName,
      counterpartyPhone: params.counterpartyPhone ?? null,
      storeName: params.storeName,
      outletName: params.outletName ?? null,
      balanceBefore: params.balanceBefore ?? null,
      balanceAfter: params.balanceAfter ?? null,
      outstandingBefore: params.outstandingBefore ?? null,
      outstandingAfter: params.outstandingAfter ?? null,
      transferReference: params.transferReference ?? null,
      bankName: params.bankName ?? null,
      notes: params.notes ?? null,
      referenceLabel: params.referenceLabel ?? null,
      paymentId: params.paymentId,
    };
  }

  methodLabel(method: string): string {
    return RECEIVABLE_PAYMENT_METHOD_LABELS[method] ?? method;
  }

  codeForKind(kind: PaymentReceiptKind): PaymentReceiptCode {
    return PAYMENT_RECEIPT_CODE_BY_KIND[kind];
  }

  titleForKind(kind: PaymentReceiptKind): string {
    return PAYMENT_RECEIPT_KIND_TITLES[kind];
  }
}
