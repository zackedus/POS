import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReceivePurchaseItemDto {
  @IsUUID('4', { message: 'productId harus UUID valid' })
  productId!: string;

  @IsNumber({}, { message: 'quantity harus angka' })
  @Min(0.001, { message: 'quantity minimal 0.001' })
  quantity!: number;

  @IsOptional()
  @IsUUID('4', { message: 'unitId harus UUID valid' })
  unitId?: string;

  @IsOptional()
  @IsInt({ message: 'unitCost harus rupiah bulat' })
  @Min(0, { message: 'unitCost tidak boleh negatif' })
  unitCost?: number;
}

export class ReceivePurchaseDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsUUID('4', { message: 'supplierId harus UUID valid' })
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'notes maksimal 500 karakter' })
  notes?: string;

  @IsArray({ message: 'items harus array' })
  @ArrayMinSize(1, { message: 'items minimal 1 barang' })
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseItemDto)
  items!: ReceivePurchaseItemDto[];
}
