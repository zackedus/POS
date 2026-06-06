import { Type } from 'class-transformer';
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ListRecentTransactionsDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number = 25;

  @IsOptional()
  @IsIn(['COMPLETED', 'VOID', 'ALL'], { message: 'status harus COMPLETED, VOID, atau ALL.' })
  status?: 'COMPLETED' | 'VOID' | 'ALL';

  @IsOptional()
  @IsISO8601({}, { message: 'dateFrom harus tanggal ISO8601 valid.' })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'dateTo harus tanggal ISO8601 valid.' })
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'search maksimal 50 karakter.' })
  search?: string;
}
