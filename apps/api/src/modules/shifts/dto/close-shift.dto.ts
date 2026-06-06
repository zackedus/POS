import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CloseShiftDto {
  @Type(() => Number)
  @IsInt({ message: 'Saldo akhir harus integer rupiah' })
  @Min(0, { message: 'Saldo akhir tidak boleh negatif' })
  closingCash!: number;
}
