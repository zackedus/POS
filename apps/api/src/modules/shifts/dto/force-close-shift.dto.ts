import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ForceCloseShiftDto {
  @IsOptional()
  @IsString({ message: 'Alasan harus berupa teks' })
  @MaxLength(500, { message: 'Alasan maksimal 500 karakter' })
  reason?: string;
}
