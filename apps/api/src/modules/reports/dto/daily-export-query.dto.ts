import { IsIn, IsOptional } from 'class-validator';
import { ReportsQueryDto } from './reports-query.dto';

export const DAILY_EXPORT_FORMATS = ['json', 'csv', 'pdf'] as const;
export type DailyExportFormat = (typeof DAILY_EXPORT_FORMATS)[number];

export class DailyExportQueryDto extends ReportsQueryDto {
  @IsOptional()
  @IsIn(DAILY_EXPORT_FORMATS, {
    message: 'format harus json, csv, atau pdf',
  })
  format?: DailyExportFormat = 'json';
}
