import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const SYNC_QUEUE_OPERATIONS = [
  'CHECKOUT_CASH',
  'CHECKOUT_SPLIT',
  'HOLD_BILL',
  'RECALL_HOLD',
] as const;
export type SyncQueueOperationDto = (typeof SYNC_QUEUE_OPERATIONS)[number];

export class SyncQueueEntryDto {
  @IsString({ message: 'clientRequestId wajib berupa teks.' })
  @MinLength(8, { message: 'clientRequestId minimal 8 karakter.' })
  clientRequestId!: string;

  @IsIn(SYNC_QUEUE_OPERATIONS, {
    message:
      'operation hanya boleh CHECKOUT_CASH, CHECKOUT_SPLIT, HOLD_BILL, atau RECALL_HOLD.',
  })
  operation!: SyncQueueOperationDto;

  @IsObject({ message: 'payload wajib berupa objek checkout.' })
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsISO8601({}, { message: 'clientCreatedAt harus format ISO 8601.' })
  clientCreatedAt?: string;

  @IsOptional()
  @IsString({ message: 'deviceId harus berupa teks.' })
  deviceId?: string;
}

export class EnqueueSyncDto {
  @IsOptional()
  @IsUUID('4', { message: 'outletId harus UUID valid.' })
  outletId?: string;

  @IsArray({ message: 'entries wajib berupa array.' })
  @ArrayMinSize(1, { message: 'entries minimal 1 item antrian.' })
  @ArrayMaxSize(50, { message: 'entries maksimal 50 item per permintaan.' })
  @ValidateNested({ each: true })
  @Type(() => SyncQueueEntryDto)
  entries!: SyncQueueEntryDto[];
}
