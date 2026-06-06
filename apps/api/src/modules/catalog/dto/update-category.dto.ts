import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Nama kategori wajib berupa teks' })
  @MaxLength(80, { message: 'Nama kategori maksimal 80 karakter' })
  name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentId harus UUID valid' })
  parentId?: string;
}
