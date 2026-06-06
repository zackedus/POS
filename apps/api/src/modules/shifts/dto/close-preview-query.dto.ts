import { IsOptional, IsUUID } from 'class-validator';

export class ClosePreviewQueryDto {
  @IsOptional()
  @IsUUID('4')
  outletId?: string;
}
