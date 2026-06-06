import { IsOptional, IsUUID } from 'class-validator';

export class StockReportQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;
}
