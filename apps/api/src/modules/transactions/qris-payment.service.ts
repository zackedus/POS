import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ErrorCodes, PaymentMethod } from '@barokah/shared';
import type { AuthJwtPayload } from '../auth/auth.types';
import { resolveOutletId } from '../../common/utils/outlet.util';
import type { InitiateQrisDto } from './dto/initiate-qris.dto';
import { TransactionsService } from './transactions.service';

export type QrisPaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

interface QrisSession {
  id: string;
  tenantId: string;
  outletId: string;
  userId: string;
  amount: number;
  status: QrisPaymentStatus;
  qrPayload: string;
  clientRequestId: string;
  checkoutPayload: InitiateQrisDto;
  transactionId?: string;
  receiptNo?: string;
  total?: number;
  createdAt: Date;
  expiresAt: Date;
}

const QRIS_SESSION_TTL_MS = 15 * 60 * 1000;
const MOCK_AUTO_CONFIRM_MS = 3000;

@Injectable()
export class QrisPaymentService {
  private readonly logger = new Logger(QrisPaymentService.name);
  private readonly sessions = new Map<string, QrisSession>();

  constructor(private readonly transactionsService: TransactionsService) {}

  async initiate(user: AuthJwtPayload, dto: InitiateQrisDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    const clientRequestId = dto.clientRequestId?.trim() || `qris-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const existing = await this.transactionsService.findExistingTransactionByRequestPublic(
      outletId,
      clientRequestId,
    );
    if (existing) {
      return {
        paymentId: clientRequestId,
        status: 'PAID' as QrisPaymentStatus,
        amount: existing.total,
        qrPayload: this.buildQrPayload(clientRequestId, existing.total),
        transactionId: existing.id,
        receiptNo: existing.receiptNo,
        total: existing.total,
        mockAutoConfirmMs: 0,
        expiresAt: new Date().toISOString(),
      };
    }

    const preview = await this.transactionsService.previewCheckoutTotal(user, {
      outletId,
      items: dto.items,
      promoRuleId: dto.promoRuleId,
    });

    const paymentId = `QRIS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date();
    const session: QrisSession = {
      id: paymentId,
      tenantId: user.tenantId,
      outletId,
      userId: user.sub,
      amount: preview.total,
      status: 'PENDING',
      qrPayload: this.buildQrPayload(paymentId, preview.total),
      clientRequestId,
      checkoutPayload: { ...dto, clientRequestId },
      createdAt: now,
      expiresAt: new Date(now.getTime() + QRIS_SESSION_TTL_MS),
    };

    this.sessions.set(paymentId, session);
    this.logger.log(`QRIS session ${paymentId} initiated — ${preview.total} IDR (mock)`);

    return {
      paymentId,
      status: session.status,
      amount: session.amount,
      qrPayload: session.qrPayload,
      mockAutoConfirmMs: MOCK_AUTO_CONFIRM_MS,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async getStatus(user: AuthJwtPayload, paymentId: string) {
    const session = this.getSessionForUser(user, paymentId);
    this.expireIfNeeded(session);

    if (session.status === 'PENDING' && this.shouldAutoConfirmMock(session)) {
      await this.completeCheckout(session, user);
    }

    return this.mapStatusResponse(session);
  }

  async confirmMockPayment(user: AuthJwtPayload, paymentId: string) {
    const session = this.getSessionForUser(user, paymentId);
    this.expireIfNeeded(session);

    if (session.status === 'EXPIRED') {
      throw new UnprocessableEntityException({
        code: ErrorCodes.PAYMENT_TIMEOUT,
        message: 'Sesi QRIS sudah kedaluwarsa. Mulai ulang checkout.',
      });
    }

    if (session.status === 'PAID') {
      return this.mapStatusResponse(session);
    }

    await this.completeCheckout(session, user);
    return this.mapStatusResponse(session);
  }

  /** Test helper — clears in-memory sessions. */
  clearSessionsForTests(): void {
    this.sessions.clear();
  }

  private getSessionForUser(user: AuthJwtPayload, paymentId: string): QrisSession {
    const session = this.sessions.get(paymentId);
    if (!session || session.tenantId !== user.tenantId) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Sesi pembayaran QRIS tidak ditemukan.',
      });
    }
    return session;
  }

  private expireIfNeeded(session: QrisSession): void {
    if (session.status === 'PENDING' && Date.now() > session.expiresAt.getTime()) {
      session.status = 'EXPIRED';
    }
  }

  private shouldAutoConfirmMock(session: QrisSession): boolean {
    return Date.now() - session.createdAt.getTime() >= MOCK_AUTO_CONFIRM_MS;
  }

  private async completeCheckout(session: QrisSession, user: AuthJwtPayload): Promise<void> {
    try {
      const result = await this.transactionsService.checkoutSplit(user, {
        outletId: session.outletId,
        items: session.checkoutPayload.items,
        promoRuleId: session.checkoutPayload.promoRuleId,
        clientRequestId: session.clientRequestId,
        payments: [
          {
            method: PaymentMethod.QRIS,
            amount: session.amount,
            reference: session.id,
          },
        ],
      });

      session.status = 'PAID';
      session.transactionId = result.id;
      session.receiptNo = result.receiptNo;
      session.total = result.total;
    } catch (error) {
      session.status = 'FAILED';
      this.logger.warn(`QRIS checkout failed for ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private mapStatusResponse(session: QrisSession) {
    return {
      paymentId: session.id,
      status: session.status,
      amount: session.amount,
      qrPayload: session.qrPayload,
      transactionId: session.transactionId ?? null,
      receiptNo: session.receiptNo ?? null,
      total: session.total ?? null,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  private buildQrPayload(paymentId: string, amount: number): string {
    return `ID.QRIS.MOCK|${paymentId}|${amount}|BAROKAH-CORE-POS`;
  }
}
