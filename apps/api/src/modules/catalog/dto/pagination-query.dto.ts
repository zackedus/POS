import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Halaman harus bilangan bulat' })
  @Min(1, { message: 'Halaman minimal 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit harus bilangan bulat' })
  @Min(1, { message: 'Limit minimal 1' })
  @Max(100, { message: 'Limit maksimal 100' })
  limit?: number;
}
