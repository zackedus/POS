import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { StockAdjustReason } from './stock-adjust-reason.enum';

export enum StockAdjustDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export class AdjustStockDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsUUID('4', { message: 'productId harus UUID valid' })
  productId!: string;

  @IsEnum(StockAdjustDirection, { message: 'direction harus IN atau OUT' })
  direction!: StockAdjustDirection;

  @IsNumber({}, { message: 'quantity harus angka' })
  @Min(0.001, { message: 'quantity minimal 0.001' })
  quantity!: number;

  @IsOptional()
  @IsEnum(StockAdjustReason, { message: 'reason tidak valid' })
  reason?: StockAdjustReason;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;
}
