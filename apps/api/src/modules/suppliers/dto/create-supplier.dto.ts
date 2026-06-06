import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @MaxLength(120, { message: 'name maksimal 120 karakter' })
  name!: string;

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
}
