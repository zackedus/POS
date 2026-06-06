import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class TransferStockDto {
  @IsOptional()
  @IsUUID('4', { message: 'fromOutletId harus UUID valid' })
  fromOutletId?: string;

  @IsUUID('4', { message: 'toOutletId harus UUID valid' })
  toOutletId!: string;

  @IsUUID('4', { message: 'productId harus UUID valid' })
  productId!: string;

  @IsNumber({}, { message: 'quantity harus angka' })
  @Min(0.001, { message: 'quantity minimal 0.001' })
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;
}
