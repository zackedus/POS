import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
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
  @IsUUID('4', { message: 'Address ID tidak valid' })
  addressId?: string;

  @ValidateIf((dto: CreateDeliveryOrderDto) => !dto.addressId)
  @ValidateNested()
  @Type(() => DeliveryAddressSnapshotDto)
  addressSnapshot?: DeliveryAddressSnapshotDto;

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

export class UpdateDeliveryStatusDto {
  @IsString()
  status!: string;

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
