import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { CheckoutItemDto } from '../../transactions/dto/checkout-cash.dto';

export class ValidatePromoDto {
  @IsOptional()
  @IsUUID('4', { message: 'promoRuleId harus UUID valid.' })
  promoRuleId?: string;

  @IsArray({ message: 'items wajib berupa array.' })
  @ArrayMinSize(1, { message: 'items minimal 1 produk.' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'subtotal harus angka.' })
  @Min(0, { message: 'subtotal tidak boleh negatif.' })
  subtotal?: number;
}
