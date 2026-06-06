import { PurchaseOrderStatus } from '@barokah/database';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListPurchaseOrdersQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { message: 'status tidak valid' })
  status?: PurchaseOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat' })
  @Min(1)
  @Max(100, { message: 'limit maksimal 100' })
  limit?: number = 50;
}
