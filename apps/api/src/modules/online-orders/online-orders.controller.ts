import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@barokah/database';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthJwtPayload } from '../auth/auth.types';
import { FulfillmentQueryDto } from './dto/fulfillment-query.dto';
import { ManagerOrdersQueryDto } from './dto/manager-orders-query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OnlineOrdersService } from './online-orders.service';

@Controller('online-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
export class OnlineOrdersController {
  constructor(private readonly onlineOrdersService: OnlineOrdersService) {}

  @Get('fulfillment')
  listFulfillment(@CurrentUser() user: AuthJwtPayload, @Query() query: FulfillmentQueryDto) {
    return this.onlineOrdersService.listFulfillment(user, query);
  }

  @Get('manager')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  listManagerOrders(@CurrentUser() user: AuthJwtPayload, @Query() query: ManagerOrdersQueryDto) {
    return this.onlineOrdersService.listManagerOrders(user, query);
  }

  @Post('maintenance/expire-pending')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  expirePending(@CurrentUser() user: AuthJwtPayload) {
    return this.onlineOrdersService.expirePendingOrders(user.tenantId);
  }

  @Get(':id/shipping-label')
  getShippingLabel(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.onlineOrdersService.getShippingLabel(user, id, outletId);
  }

  @Post(':id/ship')
  shipOrder(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.onlineOrdersService.shipOrder(user, id, outletId);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Query('outletId') outletId?: string,
  ) {
    return this.onlineOrdersService.updateStatus(user, id, dto, outletId);
  }

  @Get(':id')
  getOrder(
    @CurrentUser() user: AuthJwtPayload,
    @Param('id') id: string,
    @Query('outletId') outletId?: string,
  ) {
    return this.onlineOrdersService.getOrderDetail(user, id, outletId);
  }
}
