import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { PromoModule } from '../promo/promo.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [DatabaseModule, PromoModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
