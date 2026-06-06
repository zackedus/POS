import { Injectable } from '@nestjs/common';
import { Prisma, type SyncQueueStatus } from '@barokah/database';
import type { AuthJwtPayload } from '../auth/auth.types';
import { resolveOutletId } from '../../common/utils/outlet.util';
import { PrismaService } from '../../common/database/prisma.service';
import type { EnqueueSyncDto } from './dto/enqueue-sync.dto';
import type { SyncConflictsQueryDto, SyncOutletQueryDto } from './dto/sync-outlet-query.dto';
import { SyncReplayDispatcher } from './sync-replay.dispatcher';

type EntryResult = {
  clientRequestId: string;
  status: SyncQueueStatus;
  transactionId: string | null;
  conflictCode: string | null;
  conflictMessage: string | null;
  idempotentReplay: boolean;
};

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly replayDispatcher: SyncReplayDispatcher,
  ) {}

  async enqueue(user: AuthJwtPayload, dto: EnqueueSyncDto) {
    const outletId = resolveOutletId(user, dto.outletId);
    const results: EntryResult[] = [];

    for (const entry of dto.entries) {
      const clientRequestId = entry.clientRequestId.trim();
      const existing = await this.prisma.syncQueueEntry.findUnique({
        where: {
          outletId_clientRequestId: { outletId, clientRequestId },
        },
      });

      if (existing) {
        results.push({
          clientRequestId,
          status: existing.status,
          transactionId: existing.transactionId,
          conflictCode: existing.conflictCode,
          conflictMessage: existing.conflictMessage,
          idempotentReplay: true,
        });
        continue;
      }

      const created = await this.prisma.syncQueueEntry.create({
        data: {
          tenantId: user.tenantId,
          outletId,
          cashierId: user.sub,
          clientRequestId,
          operation: entry.operation,
          payload: entry.payload as Prisma.InputJsonValue,
          status: 'PENDING',
          deviceId: entry.deviceId?.trim() || null,
          clientCreatedAt: entry.clientCreatedAt ? new Date(entry.clientCreatedAt) : null,
        },
      });

      results.push({
        clientRequestId,
        status: created.status,
        transactionId: created.transactionId,
        conflictCode: created.conflictCode,
        conflictMessage: created.conflictMessage,
        idempotentReplay: false,
      });
    }

    const { processor, replayedCount } = await this.replayDispatcher.scheduleReplay(user, outletId);

    const refreshed = await Promise.all(
      results.map(async (item) => {
        const row = await this.prisma.syncQueueEntry.findUnique({
          where: {
            outletId_clientRequestId: { outletId, clientRequestId: item.clientRequestId },
          },
        });
        if (!row) {
          return item;
        }
        return {
          clientRequestId: item.clientRequestId,
          status: row.status,
          transactionId: row.transactionId,
          conflictCode: row.conflictCode,
          conflictMessage: row.conflictMessage,
          idempotentReplay: item.idempotentReplay,
        };
      }),
    );

    return {
      outletId,
      processor,
      replayedCount,
      entries: refreshed,
    };
  }

  async getStatus(user: AuthJwtPayload, query: SyncOutletQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);

    const grouped = await this.prisma.syncQueueEntry.groupBy({
      by: ['status'],
      where: { outletId, tenantId: user.tenantId },
      _count: { _all: true },
    });

    const counts = {
      pending: 0,
      processing: 0,
      applied: 0,
      conflict: 0,
      failed: 0,
    };

    for (const row of grouped) {
      const key = row.status.toLowerCase() as keyof typeof counts;
      if (key in counts) {
        counts[key] = row._count._all;
      }
    }

    const lastProcessed = await this.prisma.syncQueueEntry.findFirst({
      where: {
        outletId,
        tenantId: user.tenantId,
        processedAt: { not: null },
      },
      orderBy: { processedAt: 'desc' },
      select: { processedAt: true },
    });

    const bullmq =
      typeof this.replayDispatcher.getQueueMetrics === 'function'
        ? await this.replayDispatcher.getQueueMetrics()
        : null;

    return {
      outletId,
      processor: this.replayDispatcher.getProcessorLabel(),
      queue: counts,
      pendingTotal: counts.pending + counts.processing,
      conflictTotal: counts.conflict,
      lastProcessedAt: lastProcessed?.processedAt ?? null,
      ...(bullmq ? { bullmq } : {}),
    };
  }

  async getConflicts(user: AuthJwtPayload, query: SyncConflictsQueryDto) {
    const outletId = resolveOutletId(user, query.outletId);
    const limit = query.limit ?? 20;

    const conflicts = await this.prisma.syncQueueEntry.findMany({
      where: {
        outletId,
        tenantId: user.tenantId,
        status: 'CONFLICT',
      },
      orderBy: { processedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        clientRequestId: true,
        operation: true,
        conflictCode: true,
        conflictMessage: true,
        deviceId: true,
        clientCreatedAt: true,
        processedAt: true,
        createdAt: true,
      },
    });

    const total = await this.prisma.syncQueueEntry.count({
      where: {
        outletId,
        tenantId: user.tenantId,
        status: 'CONFLICT',
      },
    });

    return {
      outletId,
      total,
      conflicts: conflicts.map((row) => ({
        id: row.id,
        clientRequestId: row.clientRequestId,
        operation: row.operation,
        conflictCode: row.conflictCode,
        conflictMessage: row.conflictMessage,
        deviceId: row.deviceId,
        clientCreatedAt: row.clientCreatedAt,
        processedAt: row.processedAt,
        queuedAt: row.createdAt,
      })),
    };
  }
}
