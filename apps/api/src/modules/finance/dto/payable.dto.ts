import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@barokah/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListPayablesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @IsIn(['OPEN', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE'])
  status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID' | 'OVERDUE';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdueOnly?: boolean;
}

export class CreatePayableDto {
  @IsUUID('4')
  supplierId!: string;

  @IsOptional()
  @IsUUID('4')
  poId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPayablePaymentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsIn([
    PaymentMethod.CASH,
    PaymentMethod.TRANSFER,
    PaymentMethod.QRIS,
    PaymentMethod.E_WALLET,
    PaymentMethod.CARD,
  ])
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class CreatePayableFromPoDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
