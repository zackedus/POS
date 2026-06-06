import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, QueueEvents, Worker } from 'bullmq';
import type { AuthJwtPayload } from '../auth/auth.types';
import { RedisService } from '../../common/redis/redis.service';
import {
  SYNC_REPLAY_JOB_NAME,
  SYNC_REPLAY_QUEUE_NAME,
  type SyncReplayJobPayload,
} from './sync-queue.constants';
import { SyncQueueProcessor } from './sync-queue.processor';

export type SyncReplayDispatchResult = {
  processor: 'bullmq' | 'inline-fallback';
  replayedCount: number;
};

const REPLAY_WAIT_MS = 30_000;

@Injectable()
export class SyncReplayDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncReplayDispatcher.name);
  private queue: Queue<SyncReplayJobPayload, number> | null = null;
  private queueEvents: QueueEvents | null = null;
  private worker: Worker<SyncReplayJobPayload, number> | null = null;

  constructor(
    private readonly redisService: RedisService,
    private readonly processor: SyncQueueProcessor,
  ) {}

  async onModuleInit() {
    const connection = this.redisService.getConnectionOptions();
    if (!connection) {
      return;
    }

    const redisStatus = await this.redisService.ping();
    if (redisStatus !== 'up') {
      this.logger.warn(
        `Redis tidak tersedia (${redisStatus}) — sync replay memakai inline fallback.`,
      );
      return;
    }

    this.queue = new Queue<SyncReplayJobPayload, number>(SYNC_REPLAY_QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });

    this.queueEvents = new QueueEvents(SYNC_REPLAY_QUEUE_NAME, { connection });

    this.worker = new Worker<SyncReplayJobPayload, number>(
      SYNC_REPLAY_QUEUE_NAME,
      async (job) => {
        const user = this.toAuthUser(job.data);
        return this.processor.processPendingForOutlet(user, job.data.outletId, job.data.limit);
      },
      {
        connection,
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.warn(
        `Sync replay job gagal (jobId=${job?.id ?? 'unknown'}, outlet=${job?.data.outletId ?? 'unknown'}, attempt=${job?.attemptsMade ?? 0}): ${error.message}`,
      );
    });

    this.logger.log('BullMQ sync replay worker aktif.');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queueEvents?.close();
    await this.queue?.close();
    this.worker = null;
    this.queueEvents = null;
    this.queue = null;
  }

  async scheduleReplay(
    user: AuthJwtPayload,
    outletId: string,
    limit = 20,
  ): Promise<SyncReplayDispatchResult> {
    if (this.queue && this.queueEvents) {
      const job = await this.queue.add(
        SYNC_REPLAY_JOB_NAME,
        this.buildJobPayload(user, outletId, limit),
        {
          jobId: `replay:${outletId}:${Date.now()}`,
        },
      );

      try {
        const replayedCount = await job.waitUntilFinished(this.queueEvents, REPLAY_WAIT_MS);
        return { processor: 'bullmq', replayedCount: Number(replayedCount ?? 0) };
      } catch (error) {
        this.logger.warn(
          `BullMQ replay timeout/error untuk outlet ${outletId}, fallback inline: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }
    }

    const replayedCount = await this.processor.processPendingForOutlet(user, outletId, limit);
    return { processor: 'inline-fallback', replayedCount };
  }

  getProcessorLabel(): 'bullmq' | 'inline-fallback' {
    return this.queue ? 'bullmq' : 'inline-fallback';
  }

  async getQueueMetrics(): Promise<{
    waiting: number;
    active: number;
    failed: number;
    completed: number;
  } | null> {
    if (!this.queue) {
      return null;
    }

    const counts = await this.queue.getJobCounts('waiting', 'active', 'failed', 'completed');
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      failed: counts.failed ?? 0,
      completed: counts.completed ?? 0,
    };
  }

  private buildJobPayload(
    user: AuthJwtPayload,
    outletId: string,
    limit: number,
  ): SyncReplayJobPayload {
    return {
      tenantId: user.tenantId,
      outletId,
      sub: user.sub,
      email: user.email,
      role: user.role,
      outletIds: user.outletIds,
      limit,
    };
  }

  private toAuthUser(data: SyncReplayJobPayload): AuthJwtPayload {
    return {
      sub: data.sub,
      email: data.email,
      tenantId: data.tenantId,
      role: data.role as AuthJwtPayload['role'],
      outletIds: data.outletIds,
    };
  }
}
