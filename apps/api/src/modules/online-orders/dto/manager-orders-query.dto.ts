import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ManagerOrdersQueryDto {
  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'dateFrom harus ISO8601' })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'dateTo harus ISO8601' })
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
