import { IsOptional, IsUUID } from 'class-validator';

export class ImportProductsQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;
}
