import { PurchaseOrderStatus } from '@barokah/database';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPurchaseOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus, { message: 'status tidak valid' })
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsUUID('4', { message: 'supplierId harus UUID valid' })
  supplierId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;
}
