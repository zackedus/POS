import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { PromoModule } from '../promo/promo.module';
import { CustomersModule } from '../customers/customers.module';
import { FinanceModule } from '../finance/finance.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { QrisPaymentService } from './qris-payment.service';

@Module({
  imports: [DatabaseModule, PromoModule, CustomersModule, FinanceModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, QrisPaymentService],
  exports: [TransactionsService, QrisPaymentService],
})
export class TransactionsModule {}
