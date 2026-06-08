import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListDepositsQueryDto {
  @IsOptional()
  @IsUUID('4')
  customerId?: string;
}

export class TopUpDepositDto {
  @IsUUID('4')
  customerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundDepositDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
