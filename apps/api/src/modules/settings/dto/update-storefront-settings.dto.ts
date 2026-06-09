import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { StorefrontSortOption } from '@barokah/shared';

class StorefrontAppearanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  footerText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  promoBannerText?: string | null;
}

class StorefrontCatalogDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  featuredCategoryIds?: string[];

  @IsOptional()
  @IsString()
  defaultSort?: StorefrontSortOption;

  @IsOptional()
  @IsBoolean()
  showOutOfStock?: boolean;
}

class StorefrontBranchesDto {
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  enabledOutletIds?: string[];

  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  deliveryRadiusKm?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;
}

class StorefrontCheckoutDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  paymentInstructions?: string;

  @IsOptional()
  @IsBoolean()
  requireName?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePhone?: boolean;

  @IsOptional()
  @IsBoolean()
  requireAddress?: boolean;
}

class StorefrontPaymentDto {
  @IsOptional()
  @IsBoolean()
  manualTransferEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  onlinePaymentEnabled?: boolean;
}

class StorefrontSeoDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  metaDescription?: string;
}

class StorefrontOperationsDto {
  @IsOptional()
  @IsString()
  @MaxLength(5)
  onlineOrderHoursStart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  onlineOrderHoursEnd?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  closedMessage?: string;

  @IsOptional()
  @IsBoolean()
  temporarilyClosed?: boolean;
}

export class UpdateStorefrontSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontAppearanceDto)
  appearance?: StorefrontAppearanceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontCatalogDto)
  catalog?: StorefrontCatalogDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontBranchesDto)
  branches?: StorefrontBranchesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontCheckoutDto)
  checkout?: StorefrontCheckoutDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontPaymentDto)
  payment?: StorefrontPaymentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontSeoDto)
  seo?: StorefrontSeoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorefrontOperationsDto)
  operations?: StorefrontOperationsDto;
}
