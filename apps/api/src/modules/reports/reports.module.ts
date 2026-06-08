import { Module } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service';
import { FinanceReportsService } from './finance-reports.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsEmailScheduler } from './analytics-email.scheduler';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, FinanceReportsService, MailService, AnalyticsEmailScheduler],
  exports: [ReportsService, FinanceReportsService, AnalyticsEmailScheduler],
})
export class ReportsModule {}
