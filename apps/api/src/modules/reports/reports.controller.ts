import { Controller, Get, Header, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { DailyExportQueryDto } from './dto/daily-export-query.dto';
import { DailySummaryQueryDto, FinanceReportQueryDto } from './dto/finance-report-query.dto';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { StockReportQueryDto } from './dto/stock-report-query.dto';
import { CrossOutletStockQueryDto } from './dto/cross-outlet-stock-query.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsSummaryQueryDto } from './dto/analytics-summary-query.dto';
import { ScheduledAnalyticsExportQueryDto } from './dto/scheduled-analytics-export-query.dto';
import { FinanceReportsService } from './finance-reports.service';
import { ReportsService } from './reports.service';
import { AnalyticsEmailScheduler } from './analytics-email.scheduler';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly financeReportsService: FinanceReportsService,
    private readonly analyticsEmailScheduler: AnalyticsEmailScheduler,
  ) {}

  @Get('daily')
  getDailySales(@CurrentUser() user: AuthJwtPayload, @Query() query: ReportsQueryDto) {
    return this.reportsService.getDailySales(user, query);
  }

  @Get('finance/profit-loss')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getFinanceProfitLoss(@CurrentUser() user: AuthJwtPayload, @Query() query: FinanceReportQueryDto) {
    return this.financeReportsService.getProfitLoss(user, query);
  }

  @Get('finance/receivables')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getFinanceReceivables(@CurrentUser() user: AuthJwtPayload, @Query() query: FinanceReportQueryDto) {
    return this.financeReportsService.getReceivables(user, query);
  }

  @Get('finance/payables')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getFinancePayables(@CurrentUser() user: AuthJwtPayload, @Query() query: FinanceReportQueryDto) {
    return this.financeReportsService.getPayables(user, query);
  }

  @Get('finance/cash-flow')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getFinanceCashFlow(@CurrentUser() user: AuthJwtPayload, @Query() query: FinanceReportQueryDto) {
    return this.financeReportsService.getCashFlow(user, query);
  }

  @Get('finance/daily-summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getFinanceDailySummary(@CurrentUser() user: AuthJwtPayload, @Query() query: DailySummaryQueryDto) {
    return this.financeReportsService.getDailySummary(user, query);
  }

  @Get('payment-mix')
  getPaymentMix(@CurrentUser() user: AuthJwtPayload, @Query() query: ReportsQueryDto) {
    return this.reportsService.getPaymentMix(user, query);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthJwtPayload, @Query() query: ReportsQueryDto) {
    return this.reportsService.getDashboard(user, query);
  }

  @Get('shifts')
  getShiftSummaries(@CurrentUser() user: AuthJwtPayload, @Query() query: ReportsQueryDto) {
    return this.reportsService.getShiftSummaries(user, query);
  }

  @Get('outlets')
  listOutlets(@CurrentUser() user: AuthJwtPayload) {
    return this.reportsService.listOutlets(user);
  }

  @Get('stock')
  getStockSummary(@CurrentUser() user: AuthJwtPayload, @Query() query: StockReportQueryDto) {
    return this.reportsService.getStockSummary(user, query);
  }

  @Get('stock/low/export')
  @Header('Cache-Control', 'no-store')
  async exportLowStock(@CurrentUser() user: AuthJwtPayload, @Query() query: StockReportQueryDto) {
    const result = await this.reportsService.exportLowStockCsv(user, query);
    return new StreamableFile(Buffer.from(result.body, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${result.filename}"`,
    });
  }

  @Get('cross-outlet-stock')
  getCrossOutletStock(@CurrentUser() user: AuthJwtPayload, @Query() query: CrossOutletStockQueryDto) {
    return this.reportsService.getCrossOutletStock(user, query);
  }

  @Get('analytics/summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getAnalyticsSummary(@CurrentUser() user: AuthJwtPayload, @Query() query: AnalyticsSummaryQueryDto) {
    return this.reportsService.getAnalyticsSummary(user, query);
  }

  @Get('analytics')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getAnalytics(@CurrentUser() user: AuthJwtPayload, @Query() query: AnalyticsQueryDto) {
    return this.reportsService.getAnalytics(user, query);
  }

  @Get('analytics/export')
  @Header('Cache-Control', 'no-store')
  async exportAnalytics(@CurrentUser() user: AuthJwtPayload, @Query() query: AnalyticsQueryDto) {
    const result = await this.reportsService.exportAnalyticsMargin(user, query);
    return new StreamableFile(Buffer.from(result.body, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${result.filename}"`,
    });
  }

  @Get('analytics/export/scheduled')
  @Header('Cache-Control', 'no-store')
  async exportAnalyticsScheduled(
    @CurrentUser() user: AuthJwtPayload,
    @Query() query: ScheduledAnalyticsExportQueryDto,
  ) {
    const result = await this.reportsService.exportAnalyticsScheduled(user, query);
    return new StreamableFile(Buffer.from(result.body, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: `attachment; filename="${result.filename}"`,
    });
  }

  @Get('daily/export')
  @Header('Cache-Control', 'no-store')
  async exportDailySales(@CurrentUser() user: AuthJwtPayload, @Query() query: DailyExportQueryDto) {
    const result = await this.reportsService.exportDailySales(user, query);

    if (result.format === 'csv') {
      return new StreamableFile(Buffer.from(result.body, 'utf-8'), {
        type: 'text/csv; charset=utf-8',
        disposition: `attachment; filename="${result.filename}"`,
      });
    }

    if (result.format === 'pdf') {
      return new StreamableFile(result.body, {
        type: 'application/pdf',
        disposition: `attachment; filename="${result.filename}"`,
      });
    }

    return result;
  }

  @Post('analytics/email/weekly')
  @Roles(UserRole.OWNER)
  async triggerWeeklyAnalyticsEmail() {
    return this.analyticsEmailScheduler.runWeeklyJob();
  }
}
