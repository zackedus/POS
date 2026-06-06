import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@barokah/database';

const ASSIGNABLE_ROLES = [UserRole.MANAGER, UserRole.CASHIER, UserRole.INVENTORY, UserRole.ACCOUNTANT] as const;

export class CreateUserDto {
  @IsEmail({}, { message: 'email tidak valid' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password minimal 8 karakter' })
  @MaxLength(72, { message: 'password maksimal 72 karakter' })
  password!: string;

  @IsString()
  @MinLength(2, { message: 'fullName minimal 2 karakter' })
  @MaxLength(120, { message: 'fullName maksimal 120 karakter' })
  fullName!: string;

  @IsEnum(ASSIGNABLE_ROLES, { message: 'role tidak valid untuk pembuatan user' })
  role!: (typeof ASSIGNABLE_ROLES)[number];

  @IsArray({ message: 'outletIds harus array' })
  @ArrayMinSize(1, { message: 'outletIds minimal 1 outlet' })
  @IsUUID('4', { each: true, message: 'outletIds harus UUID valid' })
  outletIds!: string[];
}
