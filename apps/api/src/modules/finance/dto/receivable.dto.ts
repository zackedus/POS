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
import { PaymentMethod, type ReceivableAgingBucket } from '@barokah/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const RECEIVABLE_AGING_BUCKETS = [
  'CURRENT',
  'DAYS_0_30',
  'DAYS_31_60',
  'DAYS_61_90',
  'DAYS_90_PLUS',
] as const satisfies readonly ReceivableAgingBucket[];

export class ListReceivablesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID('4')
  customerId?: string;

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
  @IsIn(RECEIVABLE_AGING_BUCKETS)
  agingBucket?: ReceivableAgingBucket;

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @IsOptional()
  @IsDateString()
  dueDateTo?: string;
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
    PaymentMethod.DEPOSIT,
    PaymentMethod.QRIS,
    PaymentMethod.E_WALLET,
    PaymentMethod.CARD,
  ])
  method!: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  transferReference?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  proofUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID('4')
  shiftId?: string;
}

export class RecordCustomerReceivablePaymentDto extends RecordReceivablePaymentDto {
  @IsOptional()
  @IsUUID('4')
  receivableId?: string;
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

  @IsOptional()
  @IsIn(RECEIVABLE_AGING_BUCKETS)
  bucket?: ReceivableAgingBucket;

  @IsOptional()
  @IsString()
  customerSearch?: string;
}

export class CustomerStatementQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
