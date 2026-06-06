import { Type } from 'class-transformer';

import { ArrayMinSize, IsArray, IsOptional, IsUUID, ValidateNested } from 'class-validator';

import { CheckoutItemDto } from './checkout-cash.dto';



export class ValidateCartDto {

  @IsOptional()

  @IsUUID('4', { message: 'outletId harus UUID valid.' })

  outletId?: string;



  @IsArray({ message: 'items wajib berupa array.' })

  @ArrayMinSize(1, { message: 'items minimal 1 produk.' })

  @ValidateNested({ each: true })

  @Type(() => CheckoutItemDto)

  items!: CheckoutItemDto[];

}


