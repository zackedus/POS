import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class LinkCustomerDto {
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
}
