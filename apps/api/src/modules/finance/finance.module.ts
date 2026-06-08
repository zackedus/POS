import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';
import { FinanceCheckoutService } from './finance-checkout.service';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';

@Module({
  controllers: [ReceivablesController, PayablesController, DepositsController],
  providers: [ReceivablesService, PayablesService, DepositsService, FinanceCheckoutService],
  exports: [FinanceCheckoutService, ReceivablesService, PayablesService, DepositsService],
})
export class FinanceModule {}
