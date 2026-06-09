import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { AuthModule } from '../auth/auth.module';
import { FinanceModule } from '../finance/finance.module';
import { CustomersModule } from '../customers/customers.module';
import { MidtransWebhookController } from './midtrans-webhook.controller';
import { MidtransService } from './midtrans.service';
import { OnlineOrdersController } from './online-orders.controller';
import { OnlineOrdersService } from './online-orders.service';
import { StorefrontController } from './storefront.controller';
import { StorefrontCustomerController } from './storefront-customer.controller';
import { StorefrontCustomerAuthService } from './storefront-customer-auth.service';
import { StorefrontCustomerAuthGuard } from './storefront-customer-auth.guard';
import { StorefrontCustomerJwtStrategy } from './strategies/storefront-customer-jwt.strategy';
import { OptionalStorefrontCustomerAuthGuard } from './optional-storefront-customer-auth.guard';
import { StorefrontRateLimitGuard } from './storefront-rate-limit.guard';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, AuthModule, FinanceModule, CustomersModule],
  controllers: [
    StorefrontController,
    StorefrontCustomerController,
    OnlineOrdersController,
    MidtransWebhookController,
  ],
  providers: [
    StorefrontService,
    StorefrontCustomerAuthService,
    StorefrontCustomerAuthGuard,
    StorefrontCustomerJwtStrategy,
    OnlineOrdersService,
    MidtransService,
    OptionalStorefrontCustomerAuthGuard,
    StorefrontRateLimitGuard,
  ],
  exports: [StorefrontService, StorefrontCustomerAuthService, OnlineOrdersService, MidtransService],
})
export class OnlineOrdersModule {}
