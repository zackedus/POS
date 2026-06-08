import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class DeliveryListQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: 'Halaman harus bilangan bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number = 20;
}

export class DeliveryQueueSummaryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;
}
