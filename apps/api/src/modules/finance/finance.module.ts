import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';
import { FinanceCheckoutService } from './finance-checkout.service';
import { FinanceController } from './finance.controller';
import { FinanceSummaryService } from './finance-summary.service';
import { CreditLimitService } from './credit-limit.service';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';
import { PaymentReceiptService } from './payment-receipt.service';
import { ReceivablesController } from './receivables.controller';
import { ReceivablesService } from './receivables.service';

@Module({
  controllers: [FinanceController, ReceivablesController, PayablesController, DepositsController],
  providers: [
    FinanceSummaryService,
    ReceivablesService,
    PayablesService,
    DepositsService,
    FinanceCheckoutService,
    CreditLimitService,
    PaymentReceiptService,
  ],
  exports: [FinanceCheckoutService, FinanceSummaryService, ReceivablesService, PayablesService, DepositsService, CreditLimitService, PaymentReceiptService],
})
export class FinanceModule {}
