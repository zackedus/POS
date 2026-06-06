import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTenantSettingsDto {
  @IsOptional()
  @IsBoolean({ message: 'PPN enabled harus boolean' })
  ppnEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Tarif PPN harus angka' })
  @Min(0, { message: 'Tarif PPN minimal 0' })
  @Max(100, { message: 'Tarif PPN maksimal 100' })
  ppnRatePercent?: number;

  @IsOptional()
  @IsString({ message: 'Server Key Midtrans harus teks' })
  @MaxLength(256, { message: 'Server Key terlalu panjang' })
  midtransServerKey?: string;

  @IsOptional()
  @IsBoolean({ message: 'Mode produksi Midtrans harus boolean' })
  midtransIsProduction?: boolean;

  /** Set true to remove tenant-level Midtrans key override. */
  @IsOptional()
  @IsBoolean()
  clearMidtransServerKey?: boolean;
}
