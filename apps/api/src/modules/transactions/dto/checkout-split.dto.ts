import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaymentMethod } from '@barokah/shared';
import { CheckoutItemDto } from './checkout-cash.dto';
import { CheckoutCustomerFields } from './checkout-customer.dto';

class CheckoutSplitPaymentDto {
  @IsIn([PaymentMethod.CASH, PaymentMethod.TRANSFER, PaymentMethod.QRIS, PaymentMethod.E_WALLET, PaymentMethod.CARD], {
    message: 'method hanya boleh CASH, TRANSFER, QRIS, E_WALLET, atau CARD.',
  })
  method!: PaymentMethod;

  @Type(() => Number)
  @IsInt({ message: 'amount harus integer rupiah.' })
  @Min(1, { message: 'amount minimal 1.' })
  amount!: number;

  @IsOptional()
  @IsString({ message: 'reference harus berupa teks.' })
  reference?: string;
}

export class CheckoutSplitDto extends CheckoutCustomerFields {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsArray({ message: 'items wajib berupa array.' })
  @ArrayMinSize(1, { message: 'items minimal 1 produk.' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsArray({ message: 'payments wajib berupa array.' })
  @ArrayMinSize(1, { message: 'payments minimal 1 metode pembayaran.' })
  @ValidateNested({ each: true })
  @Type(() => CheckoutSplitPaymentDto)
  payments!: CheckoutSplitPaymentDto[];

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
