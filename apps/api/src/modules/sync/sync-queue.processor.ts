import { Injectable, Logger } from '@nestjs/common';

import { HttpException } from '@nestjs/common';

import type { SyncQueueStatus } from '@barokah/database';

import { ErrorCodes } from '@barokah/shared';

import type { AuthJwtPayload } from '../auth/auth.types';

import { TransactionsService } from '../transactions/transactions.service';

import { CheckoutCashDto } from '../transactions/dto/checkout-cash.dto';

import { CheckoutSplitDto } from '../transactions/dto/checkout-split.dto';

import { HoldTransactionDto } from '../transactions/dto/hold-transaction.dto';

import { PrismaService } from '../../common/database/prisma.service';

import { plainToInstance } from 'class-transformer';

import { validate } from 'class-validator';

import { BadRequestException } from '@nestjs/common';

import type { SyncQueueOperationDto } from './dto/enqueue-sync.dto';



type QueueRow = {

  id: string;

  outletId: string;

  cashierId: string;

  clientRequestId: string;

  operation: SyncQueueOperationDto;

  payload: unknown;

};



type RecallHoldPayload = {

  heldId: string;

  outletId?: string;

};



@Injectable()

export class SyncQueueProcessor {

  private readonly logger = new Logger(SyncQueueProcessor.name);



  constructor(

    private readonly prisma: PrismaService,

    private readonly transactionsService: TransactionsService,

  ) {}



  async processPendingForOutlet(user: AuthJwtPayload, outletId: string, limit = 20): Promise<number> {

    const pending = await this.prisma.syncQueueEntry.findMany({

      where: {

        outletId,

        tenantId: user.tenantId,

        status: 'PENDING',

      },

      orderBy: { createdAt: 'asc' },

      take: limit,

      select: {

        id: true,

        outletId: true,

        cashierId: true,

        clientRequestId: true,

        operation: true,

        payload: true,

      },

    });



    let processed = 0;

    for (const row of pending) {

      await this.replayEntry(user, row);

      processed += 1;

    }



    return processed;

  }



  async replayEntry(user: AuthJwtPayload, row: QueueRow): Promise<SyncQueueStatus> {

    await this.prisma.syncQueueEntry.update({

      where: { id: row.id },

      data: { status: 'PROCESSING' },

    });



    try {

      const checkoutUser: AuthJwtPayload = {

        ...user,

        sub: row.cashierId,

      };



      const resourceId = await this.executeOperation(checkoutUser, row);



      await this.prisma.syncQueueEntry.update({

        where: { id: row.id },

        data: {

          status: 'APPLIED',

          transactionId: resourceId,

          conflictCode: null,

          conflictMessage: null,

          processedAt: new Date(),

        },

      });



      return 'APPLIED';

    } catch (error) {

      const { code, message, status } = this.mapReplayError(error);



      await this.prisma.syncQueueEntry.update({

        where: { id: row.id },

        data: {

          status,

          conflictCode: code,

          conflictMessage: message,

          processedAt: new Date(),

        },

      });



      if (status === 'FAILED') {

        this.logger.warn(`Sync replay failed for ${row.clientRequestId}: ${message}`);

      }



      return status;

    }

  }



  private async executeOperation(user: AuthJwtPayload, row: QueueRow): Promise<string | null> {

    if (row.operation === 'HOLD_BILL') {

      const payload = await this.validateHoldPayload(row.payload);

      const held = await this.transactionsService.holdTransaction(user, {

        ...payload,

        outletId: row.outletId,

        clientRequestId: row.clientRequestId,

      });

      return held.id;

    }



    if (row.operation === 'RECALL_HOLD') {

      const payload = await this.validateRecallPayload(row.payload);

      await this.transactionsService.recallHeldTransaction(

        user,

        payload.heldId,

        payload.outletId ?? row.outletId,

      );

      return payload.heldId;

    }



    const payload = await this.validateCheckoutPayload(row.operation, row.payload);

    const payloadWithId = {

      ...payload,

      outletId: row.outletId,

      clientRequestId: row.clientRequestId,

    };



    if (row.operation === 'CHECKOUT_CASH') {

      const result = await this.transactionsService.checkoutCash(

        user,

        payloadWithId as CheckoutCashDto,

      );

      return result.id;

    }



    const result = await this.transactionsService.checkoutSplit(

      user,

      payloadWithId as CheckoutSplitDto,

    );

    return result.id;

  }



  private async validateCheckoutPayload(

    operation: 'CHECKOUT_CASH' | 'CHECKOUT_SPLIT',

    payload: unknown,

  ): Promise<CheckoutCashDto | CheckoutSplitDto> {

    const validateOptions = { whitelist: true, forbidNonWhitelisted: true };



    if (operation === 'CHECKOUT_CASH') {

      const instance = plainToInstance(CheckoutCashDto, payload);

      const errors = await validate(instance, validateOptions);

      if (errors.length > 0) {

        throw new BadRequestException({

          code: ErrorCodes.SYNC_INVALID_PAYLOAD,

          message: 'Payload antrian sync tidak valid untuk operasi checkout.',

        });

      }

      return instance;

    }



    const instance = plainToInstance(CheckoutSplitDto, payload);

    const errors = await validate(instance, validateOptions);

    if (errors.length > 0) {

      throw new BadRequestException({

        code: ErrorCodes.SYNC_INVALID_PAYLOAD,

        message: 'Payload antrian sync tidak valid untuk operasi checkout.',

      });

    }

    return instance;

  }



  private async validateHoldPayload(payload: unknown): Promise<HoldTransactionDto> {

    const instance = plainToInstance(HoldTransactionDto, payload);

    const errors = await validate(instance, {

      whitelist: true,

      forbidNonWhitelisted: true,

    });

    if (errors.length > 0) {

      throw new BadRequestException({

        code: ErrorCodes.SYNC_INVALID_PAYLOAD,

        message: 'Payload antrian sync tidak valid untuk operasi hold bill.',

      });

    }

    return instance;

  }



  private async validateRecallPayload(payload: unknown): Promise<RecallHoldPayload> {

    if (typeof payload !== 'object' || payload === null) {

      throw new BadRequestException({

        code: ErrorCodes.SYNC_INVALID_PAYLOAD,

        message: 'Payload recall hold wajib berupa objek dengan heldId.',

      });

    }



    const body = payload as Record<string, unknown>;

    if (typeof body.heldId !== 'string' || body.heldId.length < 8) {

      throw new BadRequestException({

        code: ErrorCodes.SYNC_INVALID_PAYLOAD,

        message: 'Payload recall hold wajib memuat heldId valid.',

      });

    }



    return {

      heldId: body.heldId,

      outletId: typeof body.outletId === 'string' ? body.outletId : undefined,

    };

  }



  private mapReplayError(error: unknown): {

    code: string;

    message: string;

    status: 'CONFLICT' | 'FAILED';

  } {

    if (error instanceof HttpException) {

      const response = error.getResponse();

      const body =

        typeof response === 'object' && response !== null

          ? (response as { code?: string; message?: string })

          : {};



      const code = body.code ?? ErrorCodes.SYNC_CONFLICT;

      const message =

        body.message ??

        (typeof response === 'string' ? response : 'Replay checkout gagal karena konflik bisnis.');



      const httpStatus = error.getStatus();

      const status: 'CONFLICT' | 'FAILED' = httpStatus >= 500 ? 'FAILED' : 'CONFLICT';



      return { code, message, status };

    }



    return {

      code: ErrorCodes.INTERNAL_ERROR,

      message: 'Replay checkout gagal karena kesalahan tidak terduga.',

      status: 'FAILED',

    };

  }

}

