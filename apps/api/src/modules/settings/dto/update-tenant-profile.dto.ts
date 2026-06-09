import { IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateTenantProfileDto {
  @IsOptional()
  @IsString({ message: 'Nama toko wajib berupa teks' })
  @MaxLength(120, { message: 'Nama toko maksimal 120 karakter' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Nomor kontak maksimal 20 karakter' })
  @Matches(/^[0-9+\-\s()]*$/, { message: 'Format telepon tidak valid' })
  contactPhone?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value != null && value !== '')
  @IsString()
  @MaxLength(500, { message: 'URL logo maksimal 500 karakter' })
  @IsUrl({ require_protocol: true }, { message: 'URL logo harus valid (https://…)' })
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Deskripsi maksimal 1000 karakter' })
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Nomor WhatsApp maksimal 20 karakter' })
  @Matches(/^[0-9+\-\s()]*$/, { message: 'Format WhatsApp tidak valid' })
  whatsapp?: string | null;
}
