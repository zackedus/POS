import { Type } from 'class-transformer';

import { IsBoolean, IsOptional, IsUUID, Min } from 'class-validator';



export class CreateProductUnitConversionDto {

  @IsUUID('4', { message: 'productId harus UUID valid' })

  productId!: string;



  @IsUUID('4', { message: 'sellUnitId harus UUID valid' })

  sellUnitId!: string;



  @Type(() => Number)

  @Min(0.001, { message: 'conversionToBase minimal 0.001' })

  conversionToBase!: number;



  @IsOptional()

  @IsBoolean({ message: 'isPurchaseUnit harus boolean' })

  isPurchaseUnit?: boolean;



  @IsOptional()

  @IsBoolean({ message: 'isSellUnit harus boolean' })

  isSellUnit?: boolean;



  @IsOptional()

  @IsBoolean({ message: 'isDefaultSell harus boolean' })

  isDefaultSell?: boolean;



  @IsOptional()

  @Type(() => Number)

  @Min(0.001, { message: 'sellStep minimal 0.001' })

  sellStep?: number;



  @IsOptional()

  @Type(() => Number)

  @Min(0.001, { message: 'minQty minimal 0.001' })

  minQty?: number;

}


