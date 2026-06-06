import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
const FULFILLMENT_STATUSES = ['CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'] as const;

export class UpdateOrderStatusDto {
  @IsEnum(FULFILLMENT_STATUSES)
  status!: (typeof FULFILLMENT_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
