import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CatalogProductsQueryDto {
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId!: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class CatalogProductDetailQueryDto {
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId!: string;
}

export class CatalogCategoriesQueryDto {
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId!: string;
}
