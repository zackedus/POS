import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@barokah/database';

const ASSIGNABLE_ROLES = [UserRole.MANAGER, UserRole.CASHIER, UserRole.INVENTORY, UserRole.ACCOUNTANT] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Nama lengkap minimal 2 karakter' })
  @MaxLength(120, { message: 'Nama lengkap maksimal 120 karakter' })
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Nomor HP maksimal 20 karakter' })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  phone?: string | null;

  @IsOptional()
  @IsEnum(ASSIGNABLE_ROLES, { message: 'Role tidak valid' })
  role?: (typeof ASSIGNABLE_ROLES)[number];

  @IsOptional()
  @IsBoolean({ message: 'Status aktif harus ya/tidak' })
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  @MaxLength(72, { message: 'Password maksimal 72 karakter' })
  password?: string;

  @IsOptional()
  @IsArray({ message: 'Cabang harus berupa daftar' })
  @ArrayMinSize(1, { message: 'Pilih minimal satu cabang' })
  @IsUUID('4', { each: true, message: 'ID cabang tidak valid' })
  outletIds?: string[];
}
