import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { PurchaseOrdersService } from './purchase-orders.service';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [FinanceModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, PurchaseOrdersService],
})
export class SuppliersModule {}