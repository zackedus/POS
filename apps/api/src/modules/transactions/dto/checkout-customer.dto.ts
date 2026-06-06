import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Matches, Min } from 'class-validator';

export class CheckoutCustomerFields {
  @IsOptional()
  @IsUUID('4', { message: 'customerId harus UUID valid.' })
  customerId?: string;

  @IsOptional()
  @IsString({ message: 'customerName harus berupa teks.' })
  customerName?: string;

  @IsOptional()
  @IsString({ message: 'customerPhone harus berupa teks.' })
  @Matches(/^08\d{8,11}$/, { message: 'customerPhone harus format Indonesia (08…).' })
  customerPhone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'loyaltyPointsToRedeem harus bilangan bulat.' })
  @Min(0, { message: 'loyaltyPointsToRedeem tidak boleh negatif.' })
  loyaltyPointsToRedeem?: number;
}
