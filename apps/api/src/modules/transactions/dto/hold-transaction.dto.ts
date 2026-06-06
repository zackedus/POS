import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CheckoutItemDto } from './checkout-cash.dto';

export class HoldTransactionDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsArray({ message: 'items wajib berupa array.' })
  @ArrayMinSize(1, { message: 'items minimal 1 produk.' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsOptional()
  @IsString({ message: 'label harus berupa teks.' })
  @MaxLength(60, { message: 'label maksimal 60 karakter.' })
  label?: string;

  @IsOptional()
  @IsString({ message: 'clientRequestId harus berupa teks.' })
  @MinLength(8, { message: 'clientRequestId minimal 8 karakter.' })
  clientRequestId?: string;
}
