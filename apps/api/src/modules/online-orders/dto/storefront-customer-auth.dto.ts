import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class StorefrontCustomerRegisterDto {
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^08\d{8,11}$/, { message: 'No. HP harus format Indonesia (08…)' })
  phone!: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email tidak valid' })
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72)
  password!: string;

  /** Honeypot — must stay empty. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string;
}

export class StorefrontCustomerLoginDto {
  @IsString()
  @MinLength(8, { message: 'Identitas login tidak valid' })
  @MaxLength(120)
  identifier!: string;

  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72)
  password!: string;
}

export class StorefrontCustomerUpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(08\d{8,11}|628\d{8,11})$/, { message: 'No. HP harus format Indonesia (08… atau 62…)' })
  phone?: string;

  @ValidateIf((dto: StorefrontCustomerUpdateProfileDto) => Boolean(dto.newPassword))
  @IsString()
  @MinLength(8, { message: 'Password saat ini minimal 8 karakter' })
  @MaxLength(72)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  @MaxLength(72)
  newPassword?: string;
}
