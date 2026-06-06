import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { CustomersModule } from '../customers/customers.module';
import { MidtransWebhookController } from './midtrans-webhook.controller';
import { MidtransService } from './midtrans.service';
import { OnlineOrdersController } from './online-orders.controller';
import { OnlineOrdersService } from './online-orders.service';
import { StorefrontController } from './storefront.controller';
import { StorefrontRateLimitGuard } from './storefront-rate-limit.guard';
import { StorefrontService } from './storefront.service';

@Module({
  imports: [DatabaseModule, RealtimeModule, CustomersModule],
  controllers: [StorefrontController, OnlineOrdersController, MidtransWebhookController],
  providers: [StorefrontService, OnlineOrdersService, MidtransService, StorefrontRateLimitGuard],
  exports: [StorefrontService, OnlineOrdersService, MidtransService],
})
export class OnlineOrdersModule {}
