import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class OpnameStockDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsUUID('4', { message: 'productId harus UUID valid' })
  productId!: string;

  @IsNumber({}, { message: 'actualQuantity harus angka' })
  @Min(0, { message: 'actualQuantity minimal 0' })
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;
}
