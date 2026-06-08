import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryOrderDto, UpdateDeliveryStatusDto } from './dto/delivery.dto';
import { DeliveryListQueryDto, DeliveryQueueSummaryQueryDto } from './dto/delivery-query.dto';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Get()
  list(@CurrentUser() user: AuthJwtPayload, @Query() query: DeliveryListQueryDto) {
    return this.deliveriesService.list(user, query);
  }

  @Get('queue/summary')
  queueSummary(@CurrentUser() user: AuthJwtPayload, @Query() query: DeliveryQueueSummaryQueryDto) {
    return this.deliveriesService.queueSummary(user, query);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.deliveriesService.getById(user, id, outletId);
  }

  @Post()
  create(@CurrentUser() user: AuthJwtPayload, @Body() dto: CreateDeliveryOrderDto) {
    return this.deliveriesService.create(user, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updateStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateDeliveryStatusDto,
    @Query('outletId') outletId?: string,
  ) {
    return this.deliveriesService.updateStatus(user, id, dto, outletId);
  }
}
