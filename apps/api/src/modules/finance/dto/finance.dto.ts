import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FinanceSummaryQueryDto {
  @IsOptional()
  @IsUUID('4')
  outletId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}
