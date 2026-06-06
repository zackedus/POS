import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ProductBundleItemDto } from './create-product-bundle.dto';

export class UpdateProductBundleDto {
  @IsOptional()
  @IsArray({ message: 'items wajib berupa array' })
  @ArrayMinSize(1, { message: 'items minimal 1 komponen' })
  @ValidateNested({ each: true })
  @Type(() => ProductBundleItemDto)
  items?: ProductBundleItemDto[];

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'notes harus berupa teks' })
  notes?: string;
}
