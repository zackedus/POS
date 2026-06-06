import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertProductBundleOutletPolicyDto {
  @IsUUID('4', { message: 'bundleProductId harus UUID valid' })
  bundleProductId!: string;

  @IsUUID('4', { message: 'outletId harus UUID valid' })
  outletId!: string;

  @IsBoolean({ message: 'isActive harus boolean' })
  isActive!: boolean;

  @IsOptional()
  @IsString({ message: 'notes harus berupa teks' })
  notes?: string;
}
