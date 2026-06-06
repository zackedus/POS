import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { PrismaService } from '../../common/database/prisma.service';
import { MailService } from '../../common/mail/mail.service';
import { ReportsService } from '../reports/reports.service';
import { resolveCurrentWeekRangeJakarta } from '../../common/utils/report-date.util';
import { buildAnalyticsMarginCsv } from '../../common/utils/analytics-export.util';

const WEEKLY_CRON_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsEmailScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsEmailScheduler.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit(): void {
    const enabled = (process.env.ANALYTICS_EMAIL_CRON ?? 'true') === 'true';
    if (!enabled) {
      this.logger.log('Analytics email cron disabled via ANALYTICS_EMAIL_CRON=false');
      return;
    }
    this.intervalHandle = setInterval(() => {
      void this.runWeeklyJob().catch((error) => {
        this.logger.error(`Weekly analytics email job failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, WEEKLY_CRON_MS);
    this.logger.log('Analytics weekly email scheduler aktif (interval 7 hari, mock console di dev).');
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  async runWeeklyJob(): Promise<{ tenantsProcessed: number; emailsSent: number }> {
    const tenants = await this.prisma.tenantSettings.findMany({
      where: { weeklyReportEmailEnabled: true },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            users: {
              where: { role: UserRole.OWNER, isActive: true },
              select: { email: true, fullName: true },
              take: 1,
            },
            outlets: { where: { isActive: true }, select: { id: true, name: true }, take: 1 },
          },
        },
      },
    });

    let emailsSent = 0;
    for (const settings of tenants) {
      const owner = settings.tenant.users[0];
      const outlet = settings.tenant.outlets[0];
      if (!owner?.email || !outlet) {
        continue;
      }

      const weekRange = resolveCurrentWeekRangeJakarta();
      const report = await this.reportsService.buildAnalyticsReportPublic(
        settings.tenantId,
        outlet.id,
        weekRange.startUtc,
        weekRange.endUtc,
        7,
        weekRange.dateFrom,
        weekRange.dateTo,
      );
      const csv = `\uFEFF${buildAnalyticsMarginCsv(report)}`;
      const filename = `analitik-minggu-${weekRange.dateFrom}_${weekRange.dateTo}.csv`;

      await this.mailService.send({
        to: owner.email,
        subject: `[Barokah POS] Laporan Analitik Mingguan — ${settings.tenant.name}`,
        text: `Halo ${owner.fullName},\n\nTerlampir laporan analitik margin minggu ini (${weekRange.dateFrom} s/d ${weekRange.dateTo}) untuk outlet ${outlet.name}.\n\n— Barokah Core POS`,
        attachments: [{ filename, content: csv }],
      });
      emailsSent += 1;
    }

    return { tenantsProcessed: tenants.length, emailsSent };
  }
}
