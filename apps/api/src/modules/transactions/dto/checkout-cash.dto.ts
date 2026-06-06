import { Type } from 'class-transformer';

import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';



export class CheckoutItemDto {

  @IsUUID('4', { message: 'productId harus UUID valid.' })

  productId!: string;



  @Type(() => Number)

  @IsNumber({}, { message: 'quantity harus angka.' })

  @Min(0.001, { message: 'quantity minimal 0.001.' })

  quantity!: number;



  @IsOptional()

  @IsUUID('4', { message: 'sellUnitId harus UUID valid.' })

  sellUnitId?: string;

}



export class CheckoutCashDto {

  @IsOptional()

  @IsUUID('4', { message: 'outletId harus UUID valid.' })

  outletId?: string;



  @IsArray({ message: 'items wajib berupa array.' })

  @ArrayMinSize(1, { message: 'items minimal 1 produk.' })

  @ValidateNested({ each: true })

  @Type(() => CheckoutItemDto)

  items!: CheckoutItemDto[];



  @Type(() => Number)

  @IsInt({ message: 'cashReceived harus integer rupiah.' })

  @Min(0, { message: 'cashReceived tidak boleh negatif.' })

  cashReceived!: number;



  @IsOptional()

  @IsString({ message: 'notes harus berupa teks.' })

  notes?: string;



  @IsOptional()

  @IsString({ message: 'clientRequestId harus berupa teks.' })

  clientRequestId?: string;

  @IsOptional()

  @IsUUID('4', { message: 'promoRuleId harus UUID valid.' })

  promoRuleId?: string;

}


