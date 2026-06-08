import { Type } from 'class-transformer';
import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Min, MinLength, ValidateIf } from 'class-validator';

export class CreditApprovalDto {
  @IsUUID('4', { message: 'customerId harus UUID valid.' })
  customerId!: string;

  @Type(() => Number)
  @IsInt({ message: 'creditAmount harus integer rupiah.' })
  @Min(1, { message: 'creditAmount minimal 1.' })
  creditAmount!: number;

  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @ValidateIf((dto: CreditApprovalDto) => Boolean(dto.managerEmail || dto.managerPassword))
  @IsEmail({}, { message: 'Email manager tidak valid.' })
  managerEmail?: string;

  @ValidateIf((dto: CreditApprovalDto) => Boolean(dto.managerEmail || dto.managerPassword))
  @IsString({ message: 'Password manager wajib diisi.' })
  @MinLength(1, { message: 'Password manager wajib diisi.' })
  managerPassword?: string;
}
