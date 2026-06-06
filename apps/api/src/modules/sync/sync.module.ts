import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncQueueProcessor } from './sync-queue.processor';
import { SyncReplayDispatcher } from './sync-replay.dispatcher';

@Module({
  imports: [DatabaseModule, TransactionsModule],
  controllers: [SyncController],
  providers: [SyncService, SyncQueueProcessor, SyncReplayDispatcher],
  exports: [SyncService],
})
export class SyncModule {}
