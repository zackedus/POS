import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { EnqueueSyncDto } from './dto/enqueue-sync.dto';
import { SyncConflictsQueryDto, SyncOutletQueryDto } from './dto/sync-outlet-query.dto';
import { SyncService } from './sync.service';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('queue')
  enqueue(@CurrentUser() user: AuthJwtPayload, @Body() dto: EnqueueSyncDto) {
    return this.syncService.enqueue(user, dto);
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthJwtPayload, @Query() query: SyncOutletQueryDto) {
    return this.syncService.getStatus(user, query);
  }

  @Get('conflicts')
  getConflicts(@CurrentUser() user: AuthJwtPayload, @Query() query: SyncConflictsQueryDto) {
    return this.syncService.getConflicts(user, query);
  }
}
