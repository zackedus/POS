import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class OpenShiftDto {
  @Type(() => Number)
  @IsInt({ message: 'Saldo awal harus integer rupiah' })
  @Min(0, { message: 'Saldo awal tidak boleh negatif' })
  openingCash!: number;

  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId?: string;
}
