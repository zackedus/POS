import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ShiftHistoryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'dateFrom harus tanggal ISO8601 valid' })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'dateTo harus tanggal ISO8601 valid' })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Halaman harus bilangan bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus bilangan bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number;
}
