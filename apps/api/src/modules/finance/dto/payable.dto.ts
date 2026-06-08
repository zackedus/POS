import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@barokah/shared';

export class ListPayablesQueryDto {
  @IsOptional()
  @IsUUID('4')
  supplierId?: string;

  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @IsIn(['OPEN', 'PARTIAL', 'PAID', 'VOID', 'OVERDUE'])
  status?: 'OPEN' | 'PARTIAL' | 'PAID' | 'VOID' | 'OVERDUE';
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
