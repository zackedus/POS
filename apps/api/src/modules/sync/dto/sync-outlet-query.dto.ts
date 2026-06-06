import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class SyncOutletQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;
}

export class SyncConflictsQueryDto extends SyncOutletQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit harus bilangan bulat.' })
  @Min(1, { message: 'limit minimal 1.' })
  @Max(100, { message: 'limit maksimal 100.' })
  limit?: number = 20;
}
