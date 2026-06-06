import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum AnalyticsExportPreset {
  WEEK = 'week',
}

export class ScheduledAnalyticsExportQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;

  @IsOptional()
  @IsEnum(AnalyticsExportPreset, { message: 'Preset harus week' })
  preset?: AnalyticsExportPreset = AnalyticsExportPreset.WEEK;
}
