import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class InventoryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId harus UUID valid' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, { message: 'search maksimal 80 karakter' })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'lowStockOnly harus boolean' })
  lowStockOnly?: boolean;
}
