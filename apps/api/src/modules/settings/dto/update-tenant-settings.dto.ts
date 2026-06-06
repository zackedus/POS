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

  @IsOptional()
  @IsBoolean({ message: 'Laporan mingguan email harus boolean' })
  weeklyReportEmailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  clearMidtransServerKey?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Loyalty enabled harus boolean' })
  loyaltyPointsEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Rate poin harus angka' })
  @Min(1000, { message: 'Rate poin minimal Rp 1.000' })
  loyaltyEarnRateIdr?: number;

  @IsOptional()
  @IsBoolean({ message: 'Redeem poin harus boolean' })
  loyaltyRedeemEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Nilai poin redeem harus angka' })
  @Min(100, { message: 'Nilai poin redeem minimal Rp 100' })
  loyaltyRedeemValueIdr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maks redeem harus angka' })
  @Min(1, { message: 'Maks redeem minimal 1%' })
  @Max(100, { message: 'Maks redeem maksimal 100%' })
  loyaltyRedeemMaxPercent?: number;
}
