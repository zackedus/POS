import { Type } from 'class-transformer';
import { IsUUID, Min } from 'class-validator';

export class ConvertProductQuantityDto {
  @IsUUID('4', { message: 'productId harus UUID valid' })
  productId!: string;

  @IsUUID('4', { message: 'sellUnitId harus UUID valid' })
  sellUnitId!: string;

  @Type(() => Number)
  @Min(0.001, { message: 'sellQuantity minimal 0.001' })
  sellQuantity!: number;
}
