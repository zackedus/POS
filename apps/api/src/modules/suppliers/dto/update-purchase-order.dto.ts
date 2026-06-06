import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseOrderItemDto } from './create-purchase-order.dto';

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsUUID('4', { message: 'supplierId harus UUID valid' })
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;

  @IsOptional()
  @IsDateString({}, { message: 'expectedDeliveryAt harus ISO8601' })
  expectedDeliveryAt?: string | null;

  @IsOptional()
  @IsArray({ message: 'items harus array' })
  @ArrayMinSize(1, { message: 'items minimal 1 barang' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  items?: CreatePurchaseOrderItemDto[];
}
