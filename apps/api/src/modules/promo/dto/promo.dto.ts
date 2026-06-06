import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PromoApplyTo, PromoType } from '@barokah/database';

export class CreatePromoRuleDto {
  @IsString({ message: 'Nama promo wajib diisi' })
  @MaxLength(120, { message: 'Nama promo maksimal 120 karakter' })
  name!: string;

  @IsEnum(PromoType, { message: 'Tipe promo tidak valid' })
  type!: PromoType;

  @Type(() => Number)
  @IsInt({ message: 'Nilai promo harus bilangan bulat' })
  @Min(1, { message: 'Nilai promo minimal 1' })
  value!: number;

  @IsOptional()
  @IsEnum(PromoApplyTo, { message: 'Target promo tidak valid' })
  applyTo?: PromoApplyTo;

  @IsOptional()
  @IsUUID('4', { message: 'Kategori tidak valid' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Produk tidak valid' })
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Min. belanja harus bilangan bulat rupiah' })
  @Min(0)
  minPurchase?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Tanggal mulai tidak valid' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Tanggal selesai tidak valid' })
  endsAt?: string;
}

export class UpdatePromoRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(PromoType)
  type?: PromoType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'Persentase maksimal 100' })
  value?: number;

  @IsOptional()
  @IsEnum(PromoApplyTo)
  applyTo?: PromoApplyTo;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @IsOptional()
  @IsUUID('4')
  productId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPurchase?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
