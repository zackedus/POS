import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class MarketplaceOrderItemDto {
  @IsUUID('4')
  productId!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Qty harus angka' })
  @Min(0.001, { message: 'Qty minimal 0.001' })
  quantity!: number;
}

class MarketplaceDeliveryAddressDto {
  @IsString()
  @MinLength(3, { message: 'Alamat jalan minimal 3 karakter' })
  street!: string;

  @IsString()
  @MinLength(2, { message: 'Kecamatan wajib diisi' })
  district!: string;

  @IsString()
  @MinLength(2, { message: 'Kota wajib diisi' })
  city!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class CreateMarketplaceOrderDto {
  @IsUUID('4')
  outletId!: string;

  @IsUUID('4')
  clientRequestId!: string;

  @IsIn(['TOKOPEDIA', 'SHOPEE', 'OTHER'], { message: 'Channel marketplace tidak valid' })
  channel!: 'TOKOPEDIA' | 'SHOPEE' | 'OTHER';

  @IsString()
  @MinLength(3, { message: 'No. order marketplace minimal 3 karakter' })
  externalOrderRef!: string;

  @IsString()
  @MinLength(2, { message: 'Nama pelanggan minimal 2 karakter' })
  customerName!: string;

  @IsString()
  @MinLength(8, { message: 'No. HP pelanggan tidak valid' })
  customerPhone!: string;

  @IsOptional()
  @IsString()
  customerNotes?: string;

  @IsIn(['PICKUP', 'DELIVERY'], { message: 'Tipe fulfillment tidak valid' })
  fulfillmentType!: 'PICKUP' | 'DELIVERY';

  @ValidateIf((dto: CreateMarketplaceOrderDto) => dto.fulfillmentType === 'DELIVERY')
  @ValidateNested()
  @Type(() => MarketplaceDeliveryAddressDto)
  deliveryAddress?: MarketplaceDeliveryAddressDto;

  @ValidateNested({ each: true })
  @Type(() => MarketplaceOrderItemDto)
  @ArrayMinSize(1, { message: 'Minimal 1 item order' })
  items!: MarketplaceOrderItemDto[];
}
