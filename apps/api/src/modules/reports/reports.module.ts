import { Module } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AnalyticsEmailScheduler } from './analytics-email.scheduler';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, MailService, AnalyticsEmailScheduler],
  exports: [ReportsService, AnalyticsEmailScheduler],
})
export class ReportsModule {}
