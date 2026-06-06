import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'SKU wajib berupa teks' })
  @MaxLength(40, { message: 'SKU maksimal 40 karakter' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'Barcode wajib berupa teks' })
  @Matches(/^[0-9A-Za-z-]{4,32}$/, { message: 'Format barcode tidak valid' })
  barcode?: string;

  @IsOptional()
  @IsString({ message: 'Nama produk wajib berupa teks' })
  @MaxLength(160, { message: 'Nama produk maksimal 160 karakter' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'Harga jual harus integer rupiah' })
  @Min(0, { message: 'Harga jual tidak boleh negatif' })
  price?: number;

  @IsOptional()
  @IsInt({ message: 'Cost price harus integer rupiah' })
  @Min(0, { message: 'Cost price tidak boleh negatif' })
  costPrice?: number;

  @IsOptional()
  @IsUUID('4', { message: 'unitId harus UUID valid' })
  unitId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'categoryId harus UUID valid' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentProductId harus UUID valid' })
  parentProductId?: string;

  @IsOptional()
  @IsString({ message: 'Label varian wajib berupa teks' })
  @MaxLength(80, { message: 'Label varian maksimal 80 karakter' })
  variantLabel?: string;

  @IsOptional()
  @IsBoolean({ message: 'hasVariants harus boolean' })
  hasVariants?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'isActive harus boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'sellOnline harus boolean' })
  sellOnline?: boolean;

  @IsOptional()
  @IsString({ message: 'imageUrl wajib berupa teks' })
  @MaxLength(2048, { message: 'imageUrl maksimal 2048 karakter' })
  imageUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'moq harus angka' })
  @Min(0.001, { message: 'moq minimal 0.001' })
  moq?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'orderStep harus angka' })
  @Min(0.001, { message: 'orderStep minimal 0.001' })
  orderStep?: number;
}
