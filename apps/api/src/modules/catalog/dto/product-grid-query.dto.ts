import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class ProductGridQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'categoryId harus UUID valid' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'withMeta harus boolean.' })
  withMeta?: boolean;
}
