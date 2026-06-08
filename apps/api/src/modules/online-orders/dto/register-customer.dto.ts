import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterCustomerDto {
  @IsString()
  @MinLength(2, { message: 'name minimal 2 karakter' })
  @MaxLength(120, { message: 'name maksimal 120 karakter' })
  name!: string;

  @IsString()
  @MinLength(8, { message: 'phone minimal 8 digit' })
  @MaxLength(20, { message: 'phone maksimal 20 karakter' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'email tidak valid' })
  email?: string;

  /** Honeypot — must stay empty for public bots. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string;
}
