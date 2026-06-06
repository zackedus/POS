import { IsString, Matches } from 'class-validator';

export class OrderStatusQueryDto {
  @IsString()
  @Matches(/^08\d{8,11}$/, { message: 'No. HP harus format Indonesia (08…)' })
  phone!: string;
}
