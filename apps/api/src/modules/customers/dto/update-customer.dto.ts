import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: 'No. HP tidak valid' })
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(120)
  email?: string;

  @IsOptional()
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
