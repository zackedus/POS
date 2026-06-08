import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module';
import { FinanceModule } from '../finance/finance.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [DatabaseModule, FinanceModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
