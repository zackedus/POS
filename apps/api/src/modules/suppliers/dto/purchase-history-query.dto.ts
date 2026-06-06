import { IsOptional, IsUUID } from 'class-validator';

export class PurchaseHistoryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;
}
