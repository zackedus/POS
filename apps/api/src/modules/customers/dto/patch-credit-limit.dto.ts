import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class PatchCustomerCreditLimitDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit kredit harus bilangan bulat rupiah' })
  creditLimit?: number | null;

  @IsOptional()
  @IsBoolean({ message: 'autoLimitEnabled harus boolean' })
  autoLimitEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
