import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString({ message: 'Nama kategori wajib berupa teks' })
  @IsNotEmpty({ message: 'Nama kategori wajib diisi' })
  @MaxLength(80, { message: 'Nama kategori maksimal 80 karakter' })
  name!: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentId harus UUID valid' })
  parentId?: string;
}
