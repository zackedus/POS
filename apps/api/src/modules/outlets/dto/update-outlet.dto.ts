import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateOutletDto {
  @IsOptional()
  @IsString({ message: 'Nama cabang wajib berupa teks' })
  @MaxLength(120, { message: 'Nama cabang maksimal 120 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Kode cabang wajib berupa teks' })
  @MaxLength(20, { message: 'Kode cabang maksimal 20 karakter' })
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Kode cabang hanya huruf besar, angka, underscore, atau strip' })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Alamat maksimal 300 karakter' })
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Nomor telepon maksimal 20 karakter' })
  @Matches(/^[0-9+\-\s()]*$/, { message: 'Format telepon tidak valid' })
  phone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'Jam operasional maksimal 120 karakter' })
  operatingHours?: string | null;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isDefault harus boolean' })
  isDefault?: boolean;
}
