import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class RefundTransactionDto {
  @IsString()
  @MinLength(3, { message: 'Alasan refund minimal 3 karakter' })
  @MaxLength(500, { message: 'Alasan refund maksimal 500 karakter' })
  reason!: string;

  @Type(() => Number)
  @IsInt({ message: 'Nominal refund harus bilangan bulat rupiah' })
  @Min(1, { message: 'Nominal refund minimal Rp 1' })
  amount!: number;

  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;
}
