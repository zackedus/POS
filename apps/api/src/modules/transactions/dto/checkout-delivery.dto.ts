import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DeliveryAddressSnapshotDto } from '../../deliveries/dto/delivery.dto';
import { CheckoutCustomerFields } from './checkout-customer.dto';

export class CheckoutDeliveryFields extends CheckoutCustomerFields {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'deliveryRequired harus boolean.' })
  deliveryRequired?: boolean;

  @IsOptional()
  @ValidateIf((dto: CheckoutDeliveryFields) => Boolean(dto.deliveryRequired))
  @IsUUID('4', { message: 'deliveryAddressId harus UUID valid.' })
  deliveryAddressId?: string;

  @ValidateIf(
    (dto: CheckoutDeliveryFields) => Boolean(dto.deliveryRequired) && !dto.deliveryAddressId,
  )
  @ValidateNested()
  @Type(() => DeliveryAddressSnapshotDto)
  deliveryAddressSnapshot?: DeliveryAddressSnapshotDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deliveryNotes?: string;
}
