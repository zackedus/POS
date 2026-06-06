import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString({ message: 'Nama satuan wajib berupa teks' })
  @IsNotEmpty({ message: 'Nama satuan wajib diisi' })
  @MaxLength(50, { message: 'Nama satuan maksimal 50 karakter' })
  name!: string;

  @IsString({ message: 'Simbol satuan wajib berupa teks' })
  @IsNotEmpty({ message: 'Simbol satuan wajib diisi' })
  @MaxLength(20, { message: 'Simbol satuan maksimal 20 karakter' })
  symbol!: string;
}
