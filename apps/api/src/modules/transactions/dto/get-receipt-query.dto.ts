import { IsOptional, IsUUID } from 'class-validator';

export class GetReceiptQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;
}
