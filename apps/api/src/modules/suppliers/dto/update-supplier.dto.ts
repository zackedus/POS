import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'name maksimal 120 karakter' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'phone maksimal 30 karakter' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'address maksimal 255 karakter' })
  address?: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;
}
