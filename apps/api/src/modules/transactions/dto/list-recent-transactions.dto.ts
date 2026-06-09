import { PaymentMethod, SALE_SOURCE_TYPE_FILTER_VALUES } from '@barokah/shared';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListRecentTransactionsDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsOptional()
  @IsIn(['COMPLETED', 'VOID', 'REFUND', 'PARTIAL', 'IN_PROGRESS', 'ALL'], {
    message: 'status tidak valid.',
  })
  status?: 'COMPLETED' | 'VOID' | 'REFUND' | 'PARTIAL' | 'IN_PROGRESS' | 'ALL';

  @IsOptional()
  @IsIn(SALE_SOURCE_TYPE_FILTER_VALUES, { message: 'sourceType tidak valid.' })
  sourceType?: (typeof SALE_SOURCE_TYPE_FILTER_VALUES)[number];

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

  @IsOptional()
  @IsIn([...Object.values(PaymentMethod), 'COD'], { message: 'paymentMethod tidak valid.' })
  paymentMethod?: PaymentMethod | 'COD';
}