import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { CustomersModule } from '../customers/customers.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [DatabaseModule, CustomersModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
