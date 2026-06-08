import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { CustomersModule } from '../customers/customers.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [DatabaseModule, CustomersModule, RealtimeModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
