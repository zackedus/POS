import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceivePurchaseOrderItemDto {
  @IsUUID('4', { message: 'purchaseOrderItemId harus UUID valid' })
  purchaseOrderItemId!: string;

  @IsNumber({}, { message: 'quantityReceived harus angka' })
  @Min(0.001, { message: 'quantityReceived minimal 0.001' })
  quantityReceived!: number;

  @IsOptional()
  @IsNumber({}, { message: 'unitCost harus angka' })
  @Min(0, { message: 'unitCost tidak boleh negatif' })
  unitCost?: number;
}

export class ReceivePurchaseOrderDto {
  @IsOptional()
  @IsDateString({}, { message: 'receivedAt harus ISO8601' })
  receivedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'items harus array' })
  @ArrayMinSize(1, { message: 'items minimal 1 barang' })
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseOrderItemDto)
  items!: ReceivePurchaseOrderItemDto[];
}
