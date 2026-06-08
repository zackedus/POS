import { Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class DeliveryAddressSnapshotDto {
  @IsString()
  @MinLength(1, { message: 'Label alamat wajib diisi' })
  @MaxLength(50)
  label!: string;

  @IsString()
  @MinLength(3, { message: 'Alamat minimal 3 karakter' })
  @MaxLength(200)
  addressLine1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @MinLength(2, { message: 'Kota wajib diisi' })
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;
}

export class CreateDeliveryOrderDto {
  @IsOptional()
  @IsUUID('4', { message: 'Transaction ID tidak valid' })
  transactionId?: string;

  @ValidateIf((dto: CreateDeliveryOrderDto) => !dto.transactionId)
  @IsUUID('4', { message: 'Customer ID tidak valid' })
  customerId?: string;

  @IsOptional()
  @IsString({ message: 'customerName harus berupa teks.' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'customerPhone harus berupa teks.' })
  @Matches(/^08\d{8,11}$/, { message: 'customerPhone harus format Indonesia (08…).' })
  customerPhone?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Address ID tidak valid' })
  addressId?: string;

  @ValidateIf((dto: CreateDeliveryOrderDto) => !dto.addressId)
  @ValidateNested()
  @Type(() => DeliveryAddressSnapshotDto)
  addressSnapshot?: DeliveryAddressSnapshotDto;

  @IsOptional()
  @IsIn(['STORE_DIRECT', 'ONLINE_ORDER'], { message: 'Tipe pengiriman tidak valid' })
  deliveryType?: 'STORE_DIRECT' | 'ONLINE_ORDER';

  @IsOptional()
  @IsUUID('4', { message: 'Outlet ID tidak valid' })
  outletId?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal jadwal tidak valid' })
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

const DELIVERY_STATUSES = ['MENUNGGU', 'DISIAPKAN', 'DIKIRIM', 'SELESAI', 'BATAL'] as const;

export class UpdateDeliveryStatusDto {
  @IsIn(DELIVERY_STATUSES, { message: 'Status pengiriman tidak valid' })
  status!: (typeof DELIVERY_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Tanggal jadwal tidak valid' })
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ValidateIf((dto: UpdateDeliveryStatusDto) => dto.status === 'BATAL')
  @IsString()
  @MinLength(3, { message: 'Alasan pembatalan minimal 3 karakter' })
  @MaxLength(500)
  cancelReason?: string;
}
