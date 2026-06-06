import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateOutletDto {
  @IsString({ message: 'Nama cabang wajib berupa teks' })
  @MaxLength(120, { message: 'Nama cabang maksimal 120 karakter' })
  name!: string;

  @IsString({ message: 'Kode cabang wajib berupa teks' })
  @MaxLength(20, { message: 'Kode cabang maksimal 20 karakter' })
  @Matches(/^[A-Z0-9_-]+$/, { message: 'Kode cabang hanya huruf besar, angka, underscore, atau strip' })
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Alamat maksimal 300 karakter' })
  address?: string;
}
