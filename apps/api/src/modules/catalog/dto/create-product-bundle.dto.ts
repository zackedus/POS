import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class ProductBundleItemDto {
  @IsUUID('4', { message: 'componentProductId harus UUID valid' })
  componentProductId!: string;

  @Type(() => Number)
  @Min(0.001, { message: 'quantity minimal 0.001' })
  quantity!: number;
}

export class CreateProductBundleDto {
  @IsUUID('4', { message: 'bundleProductId harus UUID valid' })
  bundleProductId!: string;

  @IsArray({ message: 'items wajib berupa array' })
  @ArrayMinSize(1, { message: 'items minimal 1 komponen' })
  @ValidateNested({ each: true })
  @Type(() => ProductBundleItemDto)
  items!: ProductBundleItemDto[];

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'notes harus berupa teks' })
  notes?: string;
}
