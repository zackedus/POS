import { IsOptional, IsUUID } from 'class-validator';

export class CrossOutletStockQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Product ID tidak valid' })
  productId?: string;
}
