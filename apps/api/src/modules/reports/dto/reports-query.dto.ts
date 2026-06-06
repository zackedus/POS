import { IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportsQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date harus format YYYY-MM-DD (kalender WIB)',
  })
  date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateFrom harus format YYYY-MM-DD (kalender WIB)',
  })
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dateTo harus format YYYY-MM-DD (kalender WIB)',
  })
  dateTo?: string;
}
