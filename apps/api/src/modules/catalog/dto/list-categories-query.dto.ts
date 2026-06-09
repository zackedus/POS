import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListCategoriesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
