import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ListHeldTransactionsDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(30, { message: 'limit maksimal 30.' })
  limit?: number = 10;
}
