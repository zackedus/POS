import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export enum ExpenseCategoryCode {
  OPERATIONAL = 'OPERATIONAL',
  LOADING_UNLOADING = 'LOADING_UNLOADING',
  SHIPPING = 'SHIPPING',
  OTHER = 'OTHER',
}

export class ListExpensesQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsOptional()
  @IsEnum(ExpenseCategoryCode, { message: 'category tidak valid.' })
  category?: ExpenseCategoryCode;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'dateFrom harus format ISO8601.' })
  dateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'dateTo harus format ISO8601.' })
  dateTo?: string;
}

export class CreateExpenseDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsEnum(ExpenseCategoryCode, { message: 'category wajib diisi dan harus valid.' })
  category!: ExpenseCategoryCode;

  @Type(() => Number)
  @IsInt({ message: 'amount harus integer rupiah.' })
  @Min(1, { message: 'amount minimal 1 rupiah.' })
  amount!: number;

  @IsOptional()
  @IsString({ message: 'description harus berupa teks.' })
  @MaxLength(500, { message: 'description maksimal 500 karakter.' })
  description?: string;

  @IsISO8601({ strict: true }, { message: 'expenseDate harus format ISO8601 (YYYY-MM-DD).' })
  expenseDate!: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string | null;

  @IsOptional()
  @IsEnum(ExpenseCategoryCode, { message: 'category tidak valid.' })
  category?: ExpenseCategoryCode;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'amount harus integer rupiah.' })
  @Min(1, { message: 'amount minimal 1 rupiah.' })
  amount?: number;

  @IsOptional()
  @IsString({ message: 'description harus berupa teks.' })
  @MaxLength(500, { message: 'description maksimal 500 karakter.' })
  description?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'expenseDate harus format ISO8601 (YYYY-MM-DD).' })
  expenseDate?: string;
}

export class ExpenseSummaryQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;
}
