import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUnitDto {
  @IsOptional()
  @IsString({ message: 'Nama satuan wajib berupa teks' })
  @MaxLength(50, { message: 'Nama satuan maksimal 50 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Simbol satuan wajib berupa teks' })
  @MaxLength(20, { message: 'Simbol satuan maksimal 20 karakter' })
  symbol?: string;
}
