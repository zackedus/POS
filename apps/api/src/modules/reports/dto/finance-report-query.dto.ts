import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { FINANCE_REPORT_PERIODS } from '@barokah/shared';

export class FinanceReportQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsIn(FINANCE_REPORT_PERIODS, { message: 'period harus day, week, month, atau year' })
  period?: (typeof FINANCE_REPORT_PERIODS)[number];

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date harus format YYYY-MM-DD (kalender WIB)',
  })
  date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from harus format YYYY-MM-DD (kalender WIB)',
  })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to harus format YYYY-MM-DD (kalender WIB)',
  })
  to?: string;
}

export class DailySummaryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date harus format YYYY-MM-DD (kalender WIB)',
  })
  date?: string;
}
