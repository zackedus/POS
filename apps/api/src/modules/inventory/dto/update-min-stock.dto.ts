import { IsNumber, Min } from 'class-validator';

export class UpdateMinStockDto {
  @IsNumber({}, { message: 'minStock harus angka' })
  @Min(0, { message: 'minStock tidak boleh negatif' })
  minStock!: number;
}
