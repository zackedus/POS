import { Type, Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  IsBoolean,
} from 'class-validator';
import { PaymentMethod } from '@barokah/shared';

export class ListReceivablesQueryDto {
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @IsIn(['OPEN', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE'])
  status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID' | 'OVERDUE';
}

export class CreateReceivableDto {
  @IsUUID('4')
  customerId!: string;

  @IsOptional()
  @IsUUID('4')
  outletId?: string;

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

export class RecordReceivablePaymentDto {
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

export class UpdateCustomerCreditLimitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  creditLimit?: number | null;
}

export class AgingReportQueryDto {
  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  groupByCustomer?: boolean;
}

export class CustomerStatementQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
