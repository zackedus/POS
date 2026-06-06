import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';

export enum AnalyticsPeriodDays {
  DAYS_7 = 7,
  DAYS_30 = 30,
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Periode harus bilangan bulat' })
  @IsEnum(AnalyticsPeriodDays, { message: 'Periode harus 7 atau 30 hari' })
  days?: AnalyticsPeriodDays = AnalyticsPeriodDays.DAYS_7;
}
