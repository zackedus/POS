import { PaymentMethod } from '@barokah/shared';
import { IsEnum, IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListRecentTransactionsDto extends PaginationQueryDto {  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

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

  @IsOptional()
  @IsEnum(PaymentMethod, { message: 'paymentMethod tidak valid.' })
  paymentMethod?: PaymentMethod;
}