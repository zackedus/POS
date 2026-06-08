import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Prisma } from '@barokah/database';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import { PrismaService } from '../../common/database/prisma.service';
import { idrToDecimal, toIdrInteger } from '../../common/utils/money.util';
import { computeReceivableStatus } from './finance.util';
import { PaymentReceiptService } from './payment-receipt.service';

type TxClient = Prisma.TransactionClient;

export interface CheckoutFinancePayment {
  method: PaymentMethod;
  amount: number;
}

@Injectable()
export class FinanceCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentReceipt: PaymentReceiptService,
  ) {}

  async getCustomerOutstandingReceivableIdr(tenantId: string, customerId: string): Promise<number> {
    const rows = await this.prisma.receivable.findMany({
      where: {
        tenantId,
        customerId,
        status: { in: ['OPEN', 'PARTIAL'] },
      },
      select: { amount: true, paidAmount: true },
    });
    return rows.reduce(
      (sum, row) => sum + Math.max(0, toIdrInteger(row.amount) - toIdrInteger(row.paidAmount)),
      0,
    );
  }

  async getCustomerDepositBalanceIdr(tenantId: string, customerId: string): Promise<number> {
    const deposit = await this.prisma.customerDeposit.findUnique({
      where: { customerId },
      select: { balance: true, status: true, tenantId: true },
    });
    if (!deposit || deposit.tenantId !== tenantId || deposit.status !== 'ACTIVE') {
      return 0;
    }
    return toIdrInteger(deposit.balance);
  }

  async getCustomerFinanceSummary(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { creditLimit: true },
    });
    if (!customer) {
      return null;
    }
    const [receivableOutstanding, depositBalance] = await Promise.all([
      this.getCustomerOutstandingReceivableIdr(tenantId, customerId),
      this.getCustomerDepositBalanceIdr(tenantId, customerId),
    ]);
    return {
      receivableOutstanding,
      depositBalance,
      creditLimit: customer.creditLimit != null ? toIdrInteger(customer.creditLimit) : null,
      creditAvailable:
        customer.creditLimit != null
          ? Math.max(0, toIdrInteger(customer.creditLimit) - receivableOutstanding)
          : null,
    };
  }

  assertCheckoutFinancePayments(params: {
    payments: CheckoutFinancePayment[];
    customerId: string | null;
    tenantId: string;
    customerCreditLimitIdr: number | null;
    customerOutstandingIdr: number;
    depositBalanceIdr: number;
    overLimitApproved?: boolean;
  }) {
    const creditTotal = params.payments
      .filter((p) => p.method === PaymentMethod.CREDIT)
      .reduce((sum, p) => sum + p.amount, 0);
    const depositTotal = params.payments
      .filter((p) => p.method === PaymentMethod.DEPOSIT)
      .reduce((sum, p) => sum + p.amount, 0);

    if (creditTotal > 0 && !params.customerId) {
      throw new BadRequestException({
        code: ErrorCodes.CUSTOMER_REQUIRED_FOR_CREDIT,
        message: 'Pilih pelanggan terlebih dahulu untuk bayar tempo.',
      });
    }

    if (depositTotal > 0 && !params.customerId) {
      throw new BadRequestException({
        code: ErrorCodes.CUSTOMER_REQUIRED_FOR_DEPOSIT,
        message: 'Pilih pelanggan terlebih dahulu untuk bayar deposit.',
      });
    }

    if (creditTotal > 0) {
      if (params.customerCreditLimitIdr === 0) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.CREDIT_NOT_ALLOWED,
          message: 'Pelanggan ini tidak diizinkan transaksi tempo.',
        });
      }
      if (params.customerCreditLimitIdr != null) {
        const projected = params.customerOutstandingIdr + creditTotal;
        if (projected > params.customerCreditLimitIdr && !params.overLimitApproved) {
          throw new UnprocessableEntityException({
            code: ErrorCodes.CREDIT_LIMIT_EXCEEDED,
            message: `Limit kredit terlampaui. Outstanding: ${params.customerOutstandingIdr}, limit: ${params.customerCreditLimitIdr}.`,
          });
        }
      }
    }

    if (depositTotal > params.depositBalanceIdr) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
        message: `Saldo deposit tidak mencukupi. Tersedia: ${params.depositBalanceIdr}.`,
      });
    }
  }

  async applyCheckoutFinanceInTransaction(
    tx: TxClient,
    params: {
      tenantId: string;
      customerId: string;
      outletId: string;
      transactionId: string;
      recordedById: string;
      payments: CheckoutFinancePayment[];
      dueDate?: string | null;
    },
  ) {
    const creditPayments = params.payments.filter((p) => p.method === PaymentMethod.CREDIT);
    const depositPayments = params.payments.filter((p) => p.method === PaymentMethod.DEPOSIT);

    if (creditPayments.length > 0) {
      const creditAmount = creditPayments.reduce((sum, p) => sum + p.amount, 0);
      const existing = await tx.receivable.findUnique({
        where: { transactionId: params.transactionId },
      });
      if (existing) {
        throw new ConflictException({
          code: ErrorCodes.DEPOSIT_ALREADY_APPLIED,
          message: 'Piutang untuk transaksi ini sudah tercatat.',
        });
      }
      await tx.receivable.create({
        data: {
          tenantId: params.tenantId,
          customerId: params.customerId,
          outletId: params.outletId,
          transactionId: params.transactionId,
          amount: idrToDecimal(creditAmount),
          paidAmount: idrToDecimal(0),
          status: 'OPEN',
          dueDate: params.dueDate ? new Date(`${params.dueDate.slice(0, 10)}T00:00:00.000Z`) : null,
          notes: `Piutang dari transaksi POS`,
        },
      });
    }

    if (depositPayments.length > 0) {
      const depositAmount = depositPayments.reduce((sum, p) => sum + p.amount, 0);
      const existingApply = await tx.depositTransaction.findFirst({
        where: {
          referenceType: 'transaction',
          referenceId: params.transactionId,
          type: 'APPLY',
        },
      });
      if (existingApply) {
        throw new ConflictException({
          code: ErrorCodes.DEPOSIT_ALREADY_APPLIED,
          message: 'Deposit sudah diaplikasikan ke transaksi ini.',
        });
      }

      let deposit = await tx.customerDeposit.findUnique({
        where: { customerId: params.customerId },
      });
      if (!deposit) {
        deposit = await tx.customerDeposit.create({
          data: {
            tenantId: params.tenantId,
            customerId: params.customerId,
            balance: idrToDecimal(0),
            status: 'ACTIVE',
          },
        });
      }
      if (deposit.status !== 'ACTIVE') {
        throw new UnprocessableEntityException({
          code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
          message: 'Akun deposit pelanggan tidak aktif.',
        });
      }
      const currentBalance = toIdrInteger(deposit.balance);
      if (depositAmount > currentBalance) {
        throw new ConflictException({
          code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
          message: 'Saldo deposit tidak mencukupi saat checkout.',
        });
      }
      const balanceAfter = currentBalance - depositAmount;
      await tx.customerDeposit.update({
        where: { id: deposit.id },
        data: { balance: idrToDecimal(balanceAfter) },
      });
      await tx.depositTransaction.create({
        data: {
          depositId: deposit.id,
          type: 'APPLY',
          amount: idrToDecimal(depositAmount),
          balanceAfter: idrToDecimal(balanceAfter),
          referenceType: 'transaction',
          referenceId: params.transactionId,
          notes: 'Apply deposit saat checkout POS',
          recordedById: params.recordedById,
        },
      });
    }
  }

  async reverseFinanceForVoid(tx: TxClient, params: {
    tenantId: string;
    transactionId: string;
    recordedById: string;
  }) {
    await this.voidLinkedReceivable(tx, params.transactionId);
    await this.restoreDepositApplyForTransaction(tx, params);
  }

  async reverseFinanceForRefund(
    tx: TxClient,
    params: {
      tenantId: string;
      transactionId: string;
      recordedById: string;
      refundAmountIdr: number;
      isFullRefund: boolean;
    },
  ) {
    const receivable = await tx.receivable.findUnique({
      where: { transactionId: params.transactionId },
    });
    if (receivable && receivable.status !== 'VOID') {
      const amountIdr = toIdrInteger(receivable.amount);
      const paidIdr = toIdrInteger(receivable.paidAmount);

      if (params.isFullRefund) {
        if (paidIdr === 0) {
          await tx.receivable.update({
            where: { id: receivable.id },
            data: { status: 'VOID' },
          });
        } else {
          await tx.receivable.update({
            where: { id: receivable.id },
            data: {
              amount: idrToDecimal(paidIdr),
              status: 'PAID',
              notes: receivable.notes
                ? `${receivable.notes} | Ditutup karena refund penuh transaksi`
                : 'Ditutup karena refund penuh transaksi',
            },
          });
        }
      } else {
        const newAmount = Math.max(paidIdr, amountIdr - params.refundAmountIdr);
        await tx.receivable.update({
          where: { id: receivable.id },
          data: {
            amount: idrToDecimal(newAmount),
            status: computeReceivableStatus(newAmount, paidIdr),
          },
        });
      }
    }

    if (params.isFullRefund) {
      await this.restoreDepositApplyForTransaction(tx, {
        tenantId: params.tenantId,
        transactionId: params.transactionId,
        recordedById: params.recordedById,
      });
    }
  }

  private async voidLinkedReceivable(tx: TxClient, transactionId: string) {
    const receivable = await tx.receivable.findUnique({
      where: { transactionId },
    });
    if (receivable && receivable.status !== 'VOID') {
      await tx.receivable.update({
        where: { id: receivable.id },
        data: { status: 'VOID' },
      });
    }
  }

  private async restoreDepositApplyForTransaction(
    tx: TxClient,
    params: {
      tenantId: string;
      transactionId: string;
      recordedById: string;
    },
  ) {
    const depositApply = await tx.depositTransaction.findFirst({
      where: {
        referenceType: 'transaction',
        referenceId: params.transactionId,
        type: 'APPLY',
      },
      include: { deposit: true },
    });
    if (depositApply && depositApply.deposit.tenantId === params.tenantId) {
      const refundAmount = toIdrInteger(depositApply.amount);
      const newBalance = toIdrInteger(depositApply.deposit.balance) + refundAmount;
      await tx.customerDeposit.update({
        where: { id: depositApply.depositId },
        data: { balance: idrToDecimal(newBalance) },
      });
      await tx.depositTransaction.create({
        data: {
          depositId: depositApply.depositId,
          type: 'REFUND',
          amount: idrToDecimal(refundAmount),
          balanceAfter: idrToDecimal(newBalance),
          referenceType: 'transaction_void',
          referenceId: params.transactionId,
          notes: 'Pengembalian deposit karena void transaksi',
          recordedById: params.recordedById,
        },
      });
    }
  }

  async recordReceivablePayment(
    tx: TxClient,
    params: {
      tenantId: string;
      receivableId: string;
      amountIdr: number;
      method: PaymentMethod;
      reference?: string | null;
      transferReference?: string | null;
      bankName?: string | null;
      proofUrl?: string | null;
      notes?: string | null;
      recordedById: string;
      shiftId?: string | null;
      receiptNumber?: string | null;
    },
  ) {
    const receivable = await tx.receivable.findUnique({
      where: { id: params.receivableId },
      select: {
        id: true,
        tenantId: true,
        customerId: true,
        status: true,
        amount: true,
        paidAmount: true,
      },
    });
    if (
      !receivable ||
      receivable.tenantId !== params.tenantId ||
      receivable.status === 'VOID' ||
      receivable.status === 'PAID'
    ) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.RECEIVABLE_NOT_OPEN,
        message: 'Piutang tidak dapat menerima pembayaran.',
      });
    }
    const amountIdr = toIdrInteger(receivable.amount);
    const paidSoFar = toIdrInteger(receivable.paidAmount);
    const outstandingBefore = amountIdr - paidSoFar;
    if (params.amountIdr <= 0 || params.amountIdr > outstandingBefore) {
      throw new UnprocessableEntityException({
        code: ErrorCodes.INVALID_INPUT,
        message: `Nominal pembayaran tidak valid. Sisa piutang: ${outstandingBefore}.`,
      });
    }

    let depositTransactionId: string | null = null;
    if (params.method === PaymentMethod.DEPOSIT) {
      let deposit = await tx.customerDeposit.findUnique({
        where: { customerId: receivable.customerId },
      });
      if (!deposit) {
        deposit = await tx.customerDeposit.create({
          data: {
            tenantId: params.tenantId,
            customerId: receivable.customerId,
            balance: idrToDecimal(0),
            status: 'ACTIVE',
          },
        });
      }
      if (deposit.status !== 'ACTIVE' || deposit.tenantId !== params.tenantId) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
          message: 'Akun deposit pelanggan tidak aktif.',
        });
      }
      const currentBalance = toIdrInteger(deposit.balance);
      if (params.amountIdr > currentBalance) {
        throw new UnprocessableEntityException({
          code: ErrorCodes.DEPOSIT_INSUFFICIENT_BALANCE,
          message: `Saldo deposit tidak mencukupi. Tersedia: ${currentBalance}.`,
        });
      }
      const balanceAfter = currentBalance - params.amountIdr;
      await tx.customerDeposit.update({
        where: { id: deposit.id },
        data: { balance: idrToDecimal(balanceAfter) },
      });
      const depositTx = await tx.depositTransaction.create({
        data: {
          depositId: deposit.id,
          type: 'APPLY',
          amount: idrToDecimal(params.amountIdr),
          balanceAfter: idrToDecimal(balanceAfter),
          referenceType: 'receivable_payment',
          referenceId: params.receivableId,
          notes: params.notes?.trim() || 'Bayar piutang via deposit',
          recordedById: params.recordedById,
        },
      });
      depositTransactionId = depositTx.id;
    }

    const transferRef = params.transferReference?.trim() || null;
    const legacyRef = params.reference?.trim() || null;
    const receiptNumber =
      params.receiptNumber ??
      (await this.paymentReceipt.nextReceiptNumber(tx, params.tenantId, 'REC'));

    const payment = await tx.receivablePayment.create({
      data: {
        receivableId: params.receivableId,
        amount: idrToDecimal(params.amountIdr),
        method: params.method,
        reference: legacyRef ?? transferRef,
        receiptNumber,
        transferReference: transferRef,
        bankName: params.bankName?.trim() || null,
        proofUrl: params.proofUrl?.trim() || null,
        notes: params.notes?.trim() || null,
        depositTransactionId,
        recordedById: params.recordedById,
        shiftId: params.shiftId ?? null,
      },
    });
    const newPaid = paidSoFar + params.amountIdr;
    await tx.receivable.update({
      where: { id: params.receivableId },
      data: {
        paidAmount: idrToDecimal(newPaid),
        status: computeReceivableStatus(amountIdr, newPaid),
      },
    });

    return {
      paymentId: payment.id,
      receiptNumber,
      amountIdr: params.amountIdr,
      outstandingBefore,
      outstandingAfter: outstandingBefore - params.amountIdr,
      createdAt: payment.createdAt,
    };
  }
}
