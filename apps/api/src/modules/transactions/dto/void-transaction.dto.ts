import { IsEmail, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class VoidTransactionDto {
  @IsString({ message: 'Alasan void wajib diisi.' })
  @MinLength(3, { message: 'Alasan void minimal 3 karakter.' })
  reason!: string;

  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @ValidateIf((dto: VoidTransactionDto) => Boolean(dto.managerEmail || dto.managerPassword))
  @IsEmail({}, { message: 'Email manager tidak valid.' })
  managerEmail?: string;

  @ValidateIf((dto: VoidTransactionDto) => Boolean(dto.managerEmail || dto.managerPassword))
  @IsString({ message: 'Password manager wajib diisi untuk persetujuan.' })
  @MinLength(1, { message: 'Password manager wajib diisi untuk persetujuan.' })
  managerPassword?: string;
}
