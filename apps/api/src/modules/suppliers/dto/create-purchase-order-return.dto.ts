import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const PURCHASE_ORDER_RETURN_REASONS = ['DAMAGED', 'WRONG_ITEM', 'EXCESS', 'OTHER'] as const;

export class CreatePurchaseOrderReturnItemDto {
  @IsUUID('4', { message: 'purchaseOrderItemId harus UUID valid' })
  purchaseOrderItemId!: string;

  @IsNumber({}, { message: 'quantityReturned harus angka' })
  @Min(0.001, { message: 'quantityReturned minimal 0.001' })
  quantityReturned!: number;

  @IsIn(PURCHASE_ORDER_RETURN_REASONS, { message: 'reason tidak valid' })
  reason!: (typeof PURCHASE_ORDER_RETURN_REASONS)[number];
}

export class CreatePurchaseOrderReturnDto {
  @IsOptional()
  @IsDateString({}, { message: 'returnedAt harus ISO8601' })
  returnedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'items harus array' })
  @ArrayMinSize(1, { message: 'items minimal 1 barang' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderReturnItemDto)
  items!: CreatePurchaseOrderReturnItemDto[];
}
