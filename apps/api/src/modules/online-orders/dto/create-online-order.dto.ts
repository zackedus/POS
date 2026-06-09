import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
const ONLINE_FULFILLMENT_TYPES = ['PICKUP', 'DELIVERY'] as const;

const ONLINE_PAYMENT_MODES = ['FULL_ONLINE', 'COD'] as const;

class DeliveryAddressDto {
  @IsString()
  @MinLength(5, { message: 'Alamat jalan minimal 5 karakter' })
  @MaxLength(300)
  street!: string;

  @IsString()
  @MinLength(2, { message: 'Kecamatan wajib diisi' })
  @MaxLength(100)
  district!: string;

  @IsString()
  @MinLength(2, { message: 'Kota/kabupaten wajib diisi' })
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;
}

class OnlineOrderCustomerDto {
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^08\d{8,11}$/, { message: 'No. HP harus format Indonesia (08…)' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class OnlineOrderItemDto {
  @IsUUID('4')
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOnlineOrderDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  clientRequestId!: string;

  @IsUUID('4')
  outletId!: string;

  @IsEnum(ONLINE_FULFILLMENT_TYPES)
  fulfillmentType!: (typeof ONLINE_FULFILLMENT_TYPES)[number];

  @ValidateNested()
  @Type(() => OnlineOrderCustomerDto)
  customer!: OnlineOrderCustomerDto;

  @ValidateNested({ each: true })
  @Type(() => OnlineOrderItemDto)
  @ArrayMinSize(1, { message: 'Keranjang tidak boleh kosong' })
  items!: OnlineOrderItemDto[];

  /** Inline address — required for delivery when customerAddressId is not provided. */
  @ValidateIf(
    (dto: CreateOnlineOrderDto) => dto.fulfillmentType === 'DELIVERY' && !dto.customerAddressId,
  )
  @IsDefined({ message: 'Alamat pengiriman wajib untuk delivery' })
  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  deliveryAddress?: DeliveryAddressDto;

  /** Saved customer address ID — required for delivery when customer login is enforced. */
  @ValidateIf((dto: CreateOnlineOrderDto) => dto.fulfillmentType === 'DELIVERY')
  @IsOptional()
  @IsUUID('4')
  customerAddressId?: string;

  /** Honeypot — must stay empty; bots that fill this field are rejected. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  /** FULL_ONLINE = bayar penuh via gateway; COD = uang muka 20% + sisa saat terima (delivery only). */
  @IsOptional()
  @IsEnum(ONLINE_PAYMENT_MODES)
  paymentMode?: (typeof ONLINE_PAYMENT_MODES)[number];
}
