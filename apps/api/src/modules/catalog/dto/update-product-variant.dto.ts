import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateProductVariantDto {
  @IsOptional()
  @IsString({ message: 'SKU wajib berupa teks' })
  @MaxLength(40, { message: 'SKU maksimal 40 karakter' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'Barcode wajib berupa teks' })
  @Matches(/^[0-9A-Za-z-]{4,32}$/, { message: 'Format barcode tidak valid' })
  barcode?: string | null;

  @IsOptional()
  @IsString({ message: 'Nama varian wajib berupa teks' })
  @MaxLength(160, { message: 'Nama varian maksimal 160 karakter' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Label varian wajib berupa teks' })
  @MaxLength(80, { message: 'Label varian maksimal 80 karakter' })
  variantLabel?: string;

  @IsOptional()
  @IsInt({ message: 'Harga jual harus integer rupiah' })
  @Min(0, { message: 'Harga jual tidak boleh negatif' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'Harga modal harus integer rupiah' })
  @Min(0, { message: 'Harga modal tidak boleh negatif' })
  costPrice?: number;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;
}
