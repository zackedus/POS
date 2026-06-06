import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includeCost harus boolean.' })
  includeCost?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId harus UUID valid' })
  categoryId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'includeInactive harus boolean.' })
  includeInactive?: boolean;
}
