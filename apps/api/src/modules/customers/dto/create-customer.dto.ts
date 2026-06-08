import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2, { message: 'name minimal 2 karakter' })
  @MaxLength(120, { message: 'name maksimal 120 karakter' })
  name!: string;

  @IsString()
  @MinLength(8, { message: 'phone minimal 8 digit' })
  @MaxLength(20, { message: 'phone maksimal 20 karakter' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(120)
  email?: string;
}
